// Server-compatible (D-014): layout only — `start`/`end` around one control.
// A password toggle is a consumer IconButton with aria-pressed (Q-12).
import type { ReactElement, ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type InputGroupProps = SurfaceProps & {
  children: ReactElement;
  start?: ReactNode;
  end?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export function InputGroup({ children, start, end, className, style, 'data-testid': testId, ref }: InputGroupProps) {
  return (
    <div ref={ref} className={cx('nova-input-group', className)} style={style} data-testid={testId}>
      {start === undefined || start === null ? null : <span className="nova-input-group__start">{start}</span>}
      {children}
      {end === undefined || end === null ? null : <span className="nova-input-group__end">{end}</span>}
    </div>
  );
}
