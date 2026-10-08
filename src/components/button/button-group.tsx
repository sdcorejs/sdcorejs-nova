// Server-compatible (D-014): a labelled group of actions. No roving focus and
// no toolbar role (§11); every button stays in the Tab order.
import type { ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type ButtonGroupProps = SurfaceProps & {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  ref?: Ref<HTMLDivElement>;
} & ({ label: string; 'aria-labelledby'?: never } | { label?: never; 'aria-labelledby': string });

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  label,
  'aria-labelledby': labelledBy,
  className,
  style,
  'data-testid': testId,
  ref,
}: ButtonGroupProps) {
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cx('nova-button-group', `nova-button-group--${orientation}`, className)}
      style={style}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
