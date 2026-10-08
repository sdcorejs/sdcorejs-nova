'use client';
// Progress (C10, §11). max: missing → 100; non-finite or ≤ 0 → 100 + diagnostic.
// value: undefined/null → indeterminate; non-finite → indeterminate + diagnostic;
// finite → clamped to [0, max]. The DOM never contains NaN/Infinity.
// Rendered with a native <progress> instead of Base UI Progress, whose indicator
// writes an inline `style` attribute (A-001 fallback; INV-014, CSP-B).
import { useEffect, useId, type Ref } from 'react';

import { useDiagnostics } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type ProgressProps = SurfaceProps & { value?: number | null; max?: number; label: string; ref?: Ref<HTMLDivElement> };

export function Progress({ value, max, label, className, style, 'data-testid': testId, ref }: ProgressProps) {
  const report = useDiagnostics('Progress');
  const labelId = useId();
  const invalidMax = max !== undefined && (!Number.isFinite(max) || max <= 0);
  const safeMax = max === undefined || invalidMax ? 100 : max;
  const invalidValue = typeof value === 'number' && !Number.isFinite(value);
  const determinate = typeof value === 'number' && Number.isFinite(value);
  const now = determinate ? Math.min(Math.max(value, 0), safeMax) : undefined;

  useEffect(() => {
    if (invalidMax) report('NOVA_PROGRESS_INVALID_MAX');
  }, [invalidMax, report]);
  useEffect(() => {
    if (invalidValue) report('NOVA_PROGRESS_INVALID_VALUE');
  }, [invalidValue, report]);

  const percent = now === undefined ? undefined : Math.round((now / safeMax) * 100);
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-labelledby={labelId}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={now}
      aria-valuetext={percent === undefined ? undefined : `${percent}%`}
      className={cx('nova-progress', now === undefined && 'nova-progress--indeterminate', className)}
      style={style}
      data-testid={testId}
    >
      <span id={labelId} className="nova-progress__label">{label}</span>
      <progress className="nova-progress__bar" aria-hidden="true" max={safeMax} value={now} />
      {percent === undefined ? null : <span className="nova-progress__value" aria-hidden="true">{`${percent}%`}</span>}
    </div>
  );
}
