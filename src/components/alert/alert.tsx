'use client';
// Alert (C09, §11): live="off" by default; polite → role=status, assertive →
// role=alert, and the live node stays the same element across rerenders.
// Dismiss calls onDismiss once per activation; visibility stays consumer-owned.
// Only provided parts are rendered, so no blank gaps (C09-AC03).
import { useEffect, type ReactNode, type Ref } from 'react';

import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { isEmptyLabel } from '../../lib/accessible-name.js';
import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';
import { IconButton } from '../button/button.js';

export type AlertProps = SurfaceProps & {
  tone?: 'tip' | 'info' | 'success' | 'warning' | 'error';
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  live?: 'off' | 'polite' | 'assertive';
  'aria-label'?: string;
  ref?: Ref<HTMLDivElement>;
};

// Known-empty content (whitespace, [], booleans, empty Fragments/elements) is absent (R24).
const present = (node: ReactNode) => !isEmptyLabel(node);

const ICON_PATHS: Readonly<Record<NonNullable<AlertProps['tone']>, string>> = {
  tip: 'M8 2a4 4 0 0 0-2 7.5V11h4V9.5A4 4 0 0 0 8 2zM6 12.5h4M6.5 14h3',
  info: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7v4.5M8 4.5v.5',
  success: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM5 8.2l2 2 4-4.4',
  warning: 'M8 1.8L1.2 14h13.6zM8 6v4M8 11.8v.4',
  error: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM5.5 5.5l5 5M10.5 5.5l-5 5',
};

export function Alert({
  tone = 'info', title, children, actions, onDismiss, live = 'off', 'aria-label': ariaLabel,
  className, style, 'data-testid': testId, ref,
}: AlertProps) {
  const { strings } = useNovaScope();
  const report = useDiagnostics('Alert');
  const hasTitle = present(title);
  const hasBody = present(children);
  const hasActions = present(actions);
  const named = Boolean(ariaLabel?.trim());
  const unnamedActionOnly = hasActions && !hasTitle && !hasBody && !named;
  useEffect(() => {
    if (unnamedActionOnly) report('NOVA_ALERT_UNNAMED');
  }, [unnamedActionOnly, report]);

  const role = live === 'polite' ? 'status' : live === 'assertive' ? 'alert' : named ? 'group' : undefined;

  return (
    <div
      ref={ref}
      role={role}
      aria-label={named ? ariaLabel : undefined}
      className={cx('nova-alert', `nova-alert--${tone}`, className)}
      style={style}
      data-testid={testId}
    >
      <span className="nova-alert__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d={ICON_PATHS[tone]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="nova-alert__content">
        {hasTitle ? <p className="nova-alert__title">{title}</p> : null}
        {hasBody ? <div className="nova-alert__body">{children}</div> : null}
        {hasActions ? <div className="nova-alert__actions">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton
          className="nova-alert__dismiss"
          variant="ghost"
          size="sm"
          label={strings.feedback.dismiss}
          onClick={() => onDismiss()}
          icon={<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" /></svg>}
        />
      ) : null}
    </div>
  );
}
