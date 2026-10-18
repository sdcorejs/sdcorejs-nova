import { useRef, useState } from 'react';

import { InlineEdit, type InlineEditCommit } from '../../../src/components/inline-edit/index.js';
import { Input } from '../../../src/components/input/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

export default function InlineEditScenario() {
  const [value, setValue] = useState('Old');
  const [revision, setRevision] = useState(1);
  const [accepted, setAccepted] = useState<InlineEditCommit<string> | null>(null);
  const [calls, setCalls] = useState(0);
  const [aborted, setAborted] = useState(false);
  const work = useRef<(() => void) | null>(null);
  return <NovaProvider locale="en"><InlineEdit value={value} display={value} revision={revision} scopeKey="profile" label="Name"
    renderEditor={({draft, setDraft, resolveConflict, conflict, awaitingAcknowledgement}) => <>
      <Input label="Draft" value={draft} onValueChange={setDraft} readOnly={awaitingAcknowledgement}/>
      {conflict && <><button onClick={() => resolveConflict('reload')}>Reload</button><button onClick={() => resolveConflict('rebase')}>Rebase</button></>}
    </>}
    onSave={(draft, context) => {
      setCalls(count => count + 1);
      setAborted(false);
      context.signal.addEventListener('abort', () => setAborted(true), {once: true});
      return new Promise(resolve => {work.current = () => resolve({value: draft, revision: Number(context.baseRevision) + 1});});
    }} onCommit={setAccepted}/>
    <button onClick={() => work.current?.()}>Complete save</button>
    <button onClick={() => {if (accepted) {setValue(accepted.value); setRevision(accepted.revision as number);}}}>Acknowledge</button>
    <button onClick={() => {setValue('Remote'); setRevision(current => current + 1);}}>Remote change</button>
    <output aria-label="Calls">{calls}</output><output aria-label="Aborted">{String(aborted)}</output>
    <output aria-label="Accepted">{accepted?.value ?? ''}</output>
  </NovaProvider>;
}
