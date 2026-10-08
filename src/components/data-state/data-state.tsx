'use client';
// DataState (C10, §6, §11): the rendered state follows `state` only — 0/false
// children are never inferred empty. Children keep their tree position while
// `refreshing`, so node identity and focus survive. Retry is consumer-owned:
// every activation calls onRetry once; `retryPending` (no internal latch) keeps
// the button focused with aria-busy/aria-disabled and ignores activation.
import type { ReactNode, Ref } from 'react';

import { useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';
import { Button } from '../button/button.js';
import { Empty } from './empty.js';
import { Spinner } from './spinner.js';

export type DataStateProps = SurfaceProps & {
  state: 'idle' | 'loading' | 'empty' | 'error' | 'ready';
  message?: string;
  onRetry?: () => void;
  retryPending?: boolean;
  children?: ReactNode;
  refreshing?: boolean;
  ref?: Ref<HTMLDivElement>;
};

export function DataState({
  state, message, onRetry, retryPending = false, children, refreshing = false, className, style, 'data-testid': testId, ref,
}: DataStateProps) {
  const { strings } = useNovaScope();
  if (state === 'idle') return null;
  const common = { ref, style, 'data-testid': testId };

  if (state === 'loading') {
    return (
      <div {...common} className={cx('nova-data-state', 'nova-data-state--loading', className)} aria-busy="true">
        <Spinner />
      </div>
    );
  }
  if (state === 'empty') {
    return (
      <div {...common} className={cx('nova-data-state', 'nova-data-state--empty', className)}>
        <Empty title={message ?? strings.feedback.empty} />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div {...common} className={cx('nova-data-state', 'nova-data-state--error', className)}>
        <p className="nova-data-state__message">{message ?? strings.feedback.errorDefault}</p>
        {onRetry ? (
          <Button variant="secondary" loading={retryPending} onClick={() => onRetry()}>{strings.feedback.retry}</Button>
        ) : null}
      </div>
    );
  }
  return (
    <div {...common} className={cx('nova-data-state', 'nova-data-state--ready', className)} aria-busy={refreshing || undefined}>
      {children}
      {refreshing ? <Spinner size="sm" label={strings.feedback.refreshing} /> : null}
    </div>
  );
}
