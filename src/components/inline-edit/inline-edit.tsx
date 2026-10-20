'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { en } from '../../i18n/en.js';
import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { abortable } from '../../lib/p1-async-lifecycle.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { LoadContext, SurfaceProps } from '../../types/index.js';
import { Button } from '../button/button.js';

export type Revision = string | number;
export type InlineEditCommit<T> = {value: T; revision: Revision};
export type InlineEditProps<T> = SurfaceProps & {
  value: T;
  revision: Revision;
  scopeKey: string;
  display: ReactNode;
  label: string;
  disabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
  renderEditor: (args: {draft: T; setDraft(value: T): void; error?: string; conflict: boolean;
    awaitingAcknowledgement: boolean; resolveConflict(choice: 'reload' | 'rebase'): void}) => ReactNode;
  onSave: (draft: T, ctx: LoadContext & {baseRevision: Revision; scopeKey: string}) => Promise<InlineEditCommit<T>>;
  onCommit: (commit: InlineEditCommit<T>) => void;
  mapError?: (error: unknown) => string;
};

export function InlineEdit<T>(props: InlineEditProps<T>) {
  const {value, revision, scopeKey, display, label, disabled, isEqual = Object.is,
    renderEditor, onSave, onCommit, mapError, className, style, 'data-testid': testId} = props;
  type Session = {generation: number; draft: T; value: T; revision: Revision; scopeKey: string; phase: 'editing' | 'saving' | 'awaiting'; error?: string; conflicted?: boolean; expected?: InlineEditCommit<T>; disabled?: boolean; observed?: {value: T; revision: Revision; scopeKey: string}};
  type Attempt = {controller: AbortController; session: Session; expected?: InlineEditCommit<T>};
  const [session, setSession] = useState<Session | null>(null);
  const owner = useRef<Attempt | null>(null);
  const generation = useRef(0);
  const current = useRef({value, revision, scopeKey, onCommit});
  const mounted = useRef(true);
  const face = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const focus = useRef<'editor' | 'face' | null>(null);
  const previouslyEditing = useRef(false);
  const {strings} = useNovaScope();
  const remoteChanged = session !== null && (revision !== session.revision || scopeKey !== session.scopeKey || !isEqual(value, session.value));
  const acknowledged = session?.phase === 'awaiting' && session.expected !== undefined
    && scopeKey === session.scopeKey && revision === session.expected.revision && isEqual(value, session.expected.value);
  if (acknowledged) setSession(null);
  else if (session && remoteChanged && session.phase !== 'editing') {
    setSession({...session, phase: 'editing', conflicted: true, expected: undefined});
  } else if (session?.phase === 'editing' && remoteChanged && !session.conflicted && isEqual(session.draft, session.value)) {
    setSession({...session, draft: value, value, revision, scopeKey, phase: 'editing', error: undefined, observed: undefined});
  } else if (session && (session.disabled !== disabled || (session.observed ?? session).revision !== revision
    || (session.observed ?? session).scopeKey !== scopeKey || !isEqual((session.observed ?? session).value, value))) {
    setSession({...session, disabled, observed: {value, revision, scopeKey}});
  }
  const conflict = Boolean(session && (remoteChanged || session.conflicted));
  useLayoutEffect(() => { current.current = {value, revision, scopeKey, onCommit}; });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; const active = owner.current; owner.current = null; active?.controller.abort();};
  }, []);
  useLayoutEffect(() => {
    if (focus.current === 'editor' && session) {
      editor.current?.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled),[tabindex="0"]')?.focus();
      focus.current = null;
    } else if (!session && (focus.current === 'face' || previouslyEditing.current)) { face.current?.focus(); focus.current = null; }
    previouslyEditing.current = session !== null;
  }, [session]);
  useLayoutEffect(() => {
    const active = owner.current;
    if (!active) return;
    if (active.expected && scopeKey === active.session.scopeKey && revision === active.expected.revision && isEqual(value, active.expected.value)) {
      owner.current = null;
    } else if (scopeKey !== active.session.scopeKey || revision !== active.session.revision || !isEqual(value, active.session.value)) {
      owner.current = null;
      active.controller.abort();
    }
  }, [value, revision, scopeKey, isEqual, session]);

  const cancel = () => {
    if (owner.current?.expected) return;
    const active = owner.current;
    owner.current = null;
    focus.current = 'face';
    setSession(null);
    active?.controller.abort();
  };
  const save = async () => {
    if (!session || disabled || conflict || session.phase !== 'editing' || owner.current) return;
    const active: Attempt = {controller: new AbortController(), session};
    owner.current = active;
    setSession({...session, phase: 'saving', error: undefined});
    try {
      const commit = await abortable(onSave(session.draft, {signal: active.controller.signal, baseRevision: session.revision, scopeKey: session.scopeKey}), active.controller.signal);
      if (!mounted.current || owner.current !== active || active.controller.signal.aborted) return;
      const authoritative = current.current;
      if (authoritative.scopeKey !== session.scopeKey || authoritative.revision !== session.revision || !isEqual(authoritative.value, session.value)) return;
      active.expected = commit;
      setSession({...session, phase: 'awaiting', expected: commit});
      current.current.onCommit(commit);
    } catch (error) {
      if (!mounted.current || owner.current !== active || active.controller.signal.aborted) return;
      let message = strings.feedback.errorDefault;
      try {message = mapError?.(error) || message;} catch { /* Safe localized fallback. */ }
      if (owner.current !== active || !mounted.current) return;
      if (!active.expected) owner.current = null;
      setSession({...session, phase: active.expected ? 'awaiting' : 'editing', expected: active.expected, error: message});
    }
  };

  return <div role="presentation" className={cx('nova-inline-edit', className)} style={style} data-testid={testId} onKeyDown={event => {
    if (session && !event.defaultPrevented && event.key === 'Escape' && !event.nativeEvent.isComposing && event.keyCode !== 229) {event.preventDefault(); cancel();}
  }}>
    {!session ? <button ref={face} type="button" className="nova-inline-edit__face" aria-label={(strings.forms.editValue ?? en.forms.editValue).replace('{label}', label)} disabled={disabled}
      onClick={() => {focus.current = 'editor'; setSession({generation: ++generation.current, draft: value, value, revision, scopeKey, phase: 'editing', disabled});}}><span className="nova-inline-edit__value">{display}</span><span className="nova-inline-edit__icon"><Icon name="edit"/></span></button>
      : <div role="group" aria-label={label}>
        <div ref={editor}>{renderEditor({draft: session.draft, setDraft: draft => {
          setSession(currentSession => currentSession?.generation === session.generation && currentSession.phase === 'editing' && !currentSession.disabled
            ? {...currentSession, draft, error: undefined} : currentSession);
        }, error: session.error, conflict, awaitingAcknowledgement: session.phase === 'awaiting', resolveConflict: choice => {
          setSession(currentSession => {
            if (currentSession?.generation !== session.generation || currentSession.phase !== 'editing' || currentSession.disabled) return currentSession;
            const authoritative = currentSession.observed ?? currentSession;
            const hasConflict = currentSession.conflicted || authoritative.revision !== currentSession.revision
              || authoritative.scopeKey !== currentSession.scopeKey || !isEqual(authoritative.value, currentSession.value);
            if (!hasConflict) return currentSession;
            return {...currentSession, draft: choice === 'reload' ? authoritative.value : currentSession.draft,
              value: authoritative.value, revision: authoritative.revision, scopeKey: authoritative.scopeKey,
              phase: 'editing', error: undefined, conflicted: false, expected: undefined, observed: undefined};
          });
        }})}</div>
        {conflict && <p role="status" className="nova-inline-edit__conflict">{strings.forms.editConflict ?? en.forms.editConflict}</p>}
        {session.error && <p role="alert">{session.error}</p>}
        {session.phase === 'awaiting' && <p role="status" className="nova-inline-edit__syncing">{strings.forms.syncingEdit ?? en.forms.syncingEdit}</p>}
        <div className="nova-inline-edit__actions">
          <Button size="sm" disabled={disabled || conflict} aria-disabled={session.phase !== 'editing' || undefined} onClick={event => {event.currentTarget.focus(); void save();}}>{strings.forms.saveEdit ?? en.forms.saveEdit}</Button>
          <Button variant="ghost" size="sm" disabled={session.phase === 'awaiting'} onClick={cancel}>{strings.feedback.cancel ?? en.feedback.cancel}</Button>
        </div>
      </div>}
  </div>;
}
