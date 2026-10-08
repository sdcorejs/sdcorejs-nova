'use client';
// Spinner (C10): a polite status with visible text; the icon is decorative and
// stops animating under prefers-reduced-motion (the text remains).
import type { Ref } from 'react';

import { useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type SpinnerProps = SurfaceProps & { label?: string; size?: 'sm' | 'md' | 'lg'; ref?: Ref<HTMLSpanElement> };

export function Spinner({ label, size = 'md', className, style, 'data-testid': testId, ref }: SpinnerProps) {
  const { strings } = useNovaScope();
  return (
    <span ref={ref} role="status" className={cx('nova-spinner', `nova-spinner--${size}`, className)} style={style} data-testid={testId}>
      <svg className="nova-spinner__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
      </svg>
      <span className="nova-spinner__label">{label ?? strings.feedback.loading}</span>
    </span>
  );
}
