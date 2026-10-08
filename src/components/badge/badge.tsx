// Server-compatible (D-014): pure display; `0` renders; no live role (C04-AC03).
import type { ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type BadgeProps = SurfaceProps & {
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
  children: ReactNode;
  icon?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
};

export function Badge({ tone = 'neutral', children, icon, className, style, 'data-testid': testId, ref }: BadgeProps) {
  return (
    <span ref={ref} className={cx('nova-badge', `nova-badge--${tone}`, className)} style={style} data-testid={testId}>
      {icon === undefined || icon === null ? null : <span className="nova-badge__icon" aria-hidden="true">{icon}</span>}
      <span className="nova-badge__label">{children}</span>
    </span>
  );
}
