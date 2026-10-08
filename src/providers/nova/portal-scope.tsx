'use client';
// Private portal scope (§8.3, INV-007; not exported). After mount it appends a
// NEW wrapper element to `portalContainer ?? document.body` carrying the scope's
// classes, data-nova-theme, dir and lang. The shared host is never modified.
import { useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../../lib/cx.js';
import { useNovaScope } from './context.js';

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function PortalScope({ children }: { children: ReactNode }) {
  const { portalContainer, tokenClasses, theme, dir, locale, inProvider } = useNovaScope();
  // false on the server and during hydration, so markup never differs (INV-003)
  const mounted = useSyncExternalStore(subscribe, onClient, onServer);
  // detached until the layout effect attaches it to the host
  const [wrapper] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')));

  useLayoutEffect(() => {
    if (!wrapper) return undefined;
    const host = portalContainer ?? wrapper.ownerDocument.body;
    host.appendChild(wrapper);
    return () => wrapper.remove();
  }, [wrapper, portalContainer]);

  useLayoutEffect(() => {
    if (!wrapper) return;
    wrapper.setAttribute('class', cx('nova-theme', ...tokenClasses));
    wrapper.setAttribute('data-nova-theme', theme);
    if (dir) wrapper.setAttribute('dir', dir);
    else wrapper.removeAttribute('dir');
    if (inProvider) wrapper.setAttribute('lang', locale);
    else wrapper.removeAttribute('lang');
  }, [wrapper, tokenClasses, theme, dir, locale, inProvider]);

  return mounted && wrapper ? createPortal(children, wrapper) : null;
}
