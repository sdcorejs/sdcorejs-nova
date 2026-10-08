// Server-compatible (D-014): containers only. Card has no parts (Q-11) and is
// never a clickable root; consumers compose headings/actions inside it.
import type { ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type CardProps = SurfaceProps & { children: ReactNode; ref?: Ref<HTMLDivElement> };
export type CardGroupProps = SurfaceProps & { children: ReactNode; gap?: 'sm' | 'md' | 'lg'; ref?: Ref<HTMLDivElement> };

export function Card({ children, className, style, 'data-testid': testId, ref }: CardProps) {
  return <div ref={ref} className={cx('nova-card', className)} style={style} data-testid={testId}>{children}</div>;
}

export function CardGroup({ children, gap = 'md', className, style, 'data-testid': testId, ref }: CardGroupProps) {
  return (
    <div ref={ref} className={cx('nova-card-group', `nova-card-group--gap-${gap}`, className)} style={style} data-testid={testId}>
      {children}
    </div>
  );
}
