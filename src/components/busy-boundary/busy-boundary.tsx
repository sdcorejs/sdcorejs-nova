'use client';
import type { ReactNode } from 'react';

import { Spinner } from '../data-state/spinner.js';
import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type BusyBoundaryProps = SurfaceProps & { busy: boolean; label: string; children: ReactNode; mode?: 'indicator' | 'block' };

export function BusyBoundary({ busy, label, children, mode = 'indicator', className, style, 'data-testid': testId }: BusyBoundaryProps) {
  return (
    <div className={cx('nova-busy-boundary', className)} style={style} data-testid={testId} data-mode={mode}>
      <div aria-busy={busy}>{children}</div>
      {busy && <Spinner label={label} size="sm" />}
    </div>
  );
}
