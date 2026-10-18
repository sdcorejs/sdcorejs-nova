'use client';
// Private portal scope (§8.3, INV-007; not exported). After mount it appends a
// NEW wrapper element to `portalContainer ?? document.body` carrying the scope's
// classes, data-nova-theme, dir and lang. The shared host is never modified.
import { useCallback, createContext, useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '../../lib/cx.js';
import { useDiagnostics, useNovaScope } from './context.js';

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

type PrimitivePortalOwner = {node: HTMLElement | null; container: HTMLElement | null | undefined; modalNode: HTMLElement | null};
const PrimitivePortalContext = createContext<PrimitivePortalOwner | null>(null);
type PortalRenderer = (container: HTMLElement, portalRef: (node: HTMLElement | null) => void) => ReactNode;

export function PortalScope({ children, modal = false }: { children: ReactNode | PortalRenderer; modal?: boolean }) {
  const { portalContainer, tokenClasses, theme, dir, locale, inProvider } = useNovaScope();
  const parent = useContext(PrimitivePortalContext);
  const delegated = typeof children === 'function';
  const nested = delegated && parent !== null;
  const report = useDiagnostics('PortalScope');
  const sameOwner = !portalContainer || portalContainer === parent?.container;
  const fallback = nested && !sameOwner && !!parent.modalNode && !parent.modalNode.contains(portalContainer!);
  const [hostIdentity, setHostIdentity] = useState({container: portalContainer, generation: 0});
  if (hostIdentity.container !== portalContainer) {
    setHostIdentity({container: portalContainer, generation: hostIdentity.generation + 1});
  }
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const owner = useMemo(() => ({node: portalNode, container: portalContainer, modalNode: modal ? portalNode : parent?.modalNode ?? null}), [portalNode, portalContainer, modal, parent?.modalNode]);
  // false on the server and during hydration, so markup never differs (INV-003)
  const mounted = useSyncExternalStore(subscribe, onClient, onServer);
  // detached until the layout effect attaches it to the host
  const [legacyWrapper] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')));
  const actualDocument = nested
    ? (sameOwner ? parent.node?.ownerDocument : fallback ? parent.modalNode?.ownerDocument : portalContainer?.ownerDocument)
    : portalContainer?.ownerDocument;
  const wrapper = useMemo(() => {
    if (!legacyWrapper || !delegated || !actualDocument || legacyWrapper.ownerDocument === actualDocument) return legacyWrapper;
    return actualDocument.createElement('div');
  }, [legacyWrapper, delegated, actualDocument]);

  // Public primitive refs precede composite-list layout registration. Attach
  // while its portal node exists so item registration sees connected nodes.
  const attachPrimitivePortal = useCallback((node: HTMLElement | null) => {
    if (wrapper) {
      if (node) {
        const host = nested ? (sameOwner ? parent?.node : fallback ? parent?.modalNode : portalContainer) : portalContainer ?? wrapper.ownerDocument.body;
        if (host && wrapper.parentNode !== host) host.appendChild(wrapper);
      } else {
        wrapper.remove();
      }
    }
    setPortalNode(node);
  }, [wrapper, nested, sameOwner, fallback, parent?.node, parent?.modalNode, portalContainer]);

  useLayoutEffect(() => {
    if (!wrapper || (delegated && !portalNode)) return undefined;
    const host = nested ? (sameOwner ? parent.node : fallback ? parent.modalNode : portalContainer) : portalContainer ?? wrapper.ownerDocument.body;
    if (!host) return undefined;
    if (wrapper.parentNode !== host) host.appendChild(wrapper);
    return () => wrapper.remove();
  }, [wrapper, portalContainer, nested, parent, sameOwner, fallback, delegated, portalNode]);

  useLayoutEffect(() => {
    if (fallback && portalNode) report('NOVA_NESTED_PORTAL_CONTAINER');
  }, [fallback, portalNode, report]);

  useLayoutEffect(() => {
    if (!wrapper) return;
    wrapper.setAttribute('class', cx('nova-theme', delegated && 'nova-overlay-scope', ...tokenClasses));
    wrapper.setAttribute('data-nova-theme', theme);
    if (dir) wrapper.setAttribute('dir', dir);
    else wrapper.removeAttribute('dir');
    if (inProvider) wrapper.setAttribute('lang', locale);
    else wrapper.removeAttribute('lang');
  }, [wrapper, tokenClasses, theme, dir, locale, inProvider, delegated]);

  if (!mounted || !wrapper || (nested && !parent.node)) return null;
  // Primitive renderers receive the scoped host and own their one portal.
  // Plain children retain the existing private React portal behavior.
  return delegated
    ? <PrimitivePortalContext.Provider key={hostIdentity.generation} value={owner}>{children(wrapper, attachPrimitivePortal)}</PrimitivePortalContext.Provider>
    : createPortal(children, wrapper);
}
