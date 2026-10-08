'use client';
// Breadcrumb (C06, Q-08): labelled nav + ol; the last item is the current page
// (aria-current, never a fake href). Long trails collapse their middle items
// with CSS container queries; an inline disclosure button (aria-expanded,
// no popup) reveals them. `renderLink` is only called for safe, non-current hrefs.
import { useId, useState, type ReactNode, type Ref } from 'react';

import { useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import { sanitizeHref } from '../../lib/safe-href.js';
import type { SurfaceProps } from '../../types/index.js';
import { Link } from '../link/link.js';

export type BreadcrumbItem = { id: string; label: string; href?: string };

export type BreadcrumbProps = SurfaceProps & {
  items: readonly BreadcrumbItem[];
  renderLink?: (item: BreadcrumbItem) => ReactNode;
  label?: string;
  ref?: Ref<HTMLElement>;
};

function Separator() {
  return (
    <span className="nova-breadcrumb__separator" aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </span>
  );
}

export function Breadcrumb({ items, renderLink, label, className, style, 'data-testid': testId, ref }: BreadcrumbProps) {
  const { strings } = useNovaScope();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const collapsible = items.length > 3;
  const lastIndex = items.length - 1;

  return (
    <nav
      ref={ref}
      aria-label={label ?? strings.navigation.breadcrumb}
      className={cx('nova-breadcrumb', collapsible && 'nova-breadcrumb--collapsible', className)}
      style={style}
      data-testid={testId}
      data-expanded={expanded ? '' : undefined}
    >
      <ol id={listId} className="nova-breadcrumb__list">
        {items.map((item, index) => {
          const current = index === lastIndex;
          const safe = item.href === undefined ? null : sanitizeHref(item.href);
          const hideable = collapsible && index > 0 && index < lastIndex;
          let content: ReactNode;
          if (current) content = <span className="nova-breadcrumb__current" aria-current="page">{item.label}</span>;
          else {
            // Nova-owned boundary around default or custom content: width containment
            // and touch-target sizing apply here, never to consumer markup elsewhere.
            const inner = safe === null
              ? <span className="nova-breadcrumb__text">{item.label}</span>
              : renderLink ? renderLink({ ...item, href: safe }) : <Link href={safe}>{item.label}</Link>;
            content = <span className="nova-breadcrumb__content">{inner}</span>;
          }
          return [
            <li key={item.id} className={cx('nova-breadcrumb__item', hideable && 'nova-breadcrumb__item--collapsible')}>
              {content}
              {current ? null : <Separator />}
            </li>,
            collapsible && index === 0 ? (
              <li key="__nova-disclosure" className="nova-breadcrumb__item nova-breadcrumb__item--disclosure">
                <button
                  type="button"
                  className="nova-breadcrumb__toggle"
                  aria-expanded={expanded}
                  aria-controls={listId}
                  aria-label={strings.navigation.showHidden}
                  onClick={() => setExpanded((previous) => !previous)}
                >
                  <span aria-hidden="true">…</span>
                </button>
                <Separator />
              </li>
            ) : null,
          ];
        })}
      </ol>
    </nav>
  );
}
