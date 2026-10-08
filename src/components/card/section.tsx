// Server-compatible (D-014): explicit heading level, actions wrap below the
// title at narrow widths (CSS), no collapse (C17 is separate).
import type { ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type SectionProps = SurfaceProps & {
  title: ReactNode;
  headingLevel?: 2 | 3 | 4;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
};
export type SectionItemProps = SurfaceProps & { children: ReactNode; ref?: Ref<HTMLDivElement> };

export function Section({
  title, headingLevel = 2, description, actions, children, className, style, 'data-testid': testId, ref,
}: SectionProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section ref={ref} className={cx('nova-section', className)} style={style} data-testid={testId}>
      <div className="nova-section__header">
        <div className="nova-section__heading">
          <Heading className="nova-section__title">{title}</Heading>
          {description === undefined || description === null ? null : <p className="nova-section__description">{description}</p>}
        </div>
        {actions === undefined || actions === null ? null : <div className="nova-section__actions">{actions}</div>}
      </div>
      <div className="nova-section__body">{children}</div>
    </section>
  );
}

export function SectionItem({ children, className, style, 'data-testid': testId, ref }: SectionItemProps) {
  return <div ref={ref} className={cx('nova-section-item', className)} style={style} data-testid={testId}>{children}</div>;
}
