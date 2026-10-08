// Server-compatible (D-014): router-agnostic anchor. Only allowlisted hrefs
// navigate (INV-010); anything else renders non-navigating text and the ref
// receives nothing. target="_blank" always carries rel="noopener noreferrer",
// merged with the consumer's tokens. Nova never sets target itself.
import type { AnchorHTMLAttributes, ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';
import { sanitizeHref } from '../../lib/safe-href.js';

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> & {
  href: string;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
};

const ANCHOR_ONLY = ['download', 'hrefLang', 'ping', 'referrerPolicy', 'type', 'media'] as const;

function mergeRel(rel: string | undefined, target: string | undefined): string | undefined {
  if (target !== '_blank') return rel;
  const tokens = (rel ?? '').split(/\s+/u).filter(Boolean);
  for (const required of ['noopener', 'noreferrer']) if (!tokens.includes(required)) tokens.push(required);
  return tokens.join(' ');
}

export function Link({ href, children, rel, target, className, ref, ...rest }: LinkProps) {
  const safe = sanitizeHref(href);
  if (safe === null) {
    // Keep common attributes (id, data-*, aria-*, style…) but nothing that implies navigation.
    const common: Record<string, unknown> = { ...rest };
    for (const key of ANCHOR_ONLY) delete common[key];
    return <span {...common} className={cx('nova-link', 'nova-link--inert', className)}>{children}</span>;
  }
  return (
    <a {...rest} ref={ref} href={safe} target={target} rel={mergeRel(rel, target)} className={cx('nova-link', className)}>
      {children}
    </a>
  );
}
