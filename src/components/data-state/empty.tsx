// Server-compatible (D-014): empty-state presentation; actions are consumer-owned.
import type { ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type EmptyProps = SurfaceProps & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export function Empty({ title, description, actions, icon, className, style, 'data-testid': testId, ref }: EmptyProps) {
  return (
    <div ref={ref} className={cx('nova-empty', className)} style={style} data-testid={testId}>
      {icon === undefined || icon === null ? null : <div className="nova-empty__icon" aria-hidden="true">{icon}</div>}
      <p className="nova-empty__title">{title}</p>
      {description === undefined || description === null ? null : <p className="nova-empty__description">{description}</p>}
      {actions === undefined || actions === null ? null : <div className="nova-empty__actions">{actions}</div>}
    </div>
  );
}
