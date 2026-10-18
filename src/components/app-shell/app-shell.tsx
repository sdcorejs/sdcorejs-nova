'use client';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useMediaQuery } from '../../hooks/viewport/viewport.js';

import { cx } from '../../lib/cx.js';
import { sanitizeHref } from '../../lib/safe-href.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics } from '../../providers/nova/context.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';
import { Drawer } from '../dialog/dialog.js';

export type AppShellProps = SurfaceProps & {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  mainId?: string;
  skipLabel?: string;
};

export type NavLink = {id: string; label: string; href: string; icon?: ReactNode; disabled?: boolean};
export type NavItem = NavLink | {id: string; label: string; icon?: ReactNode; children: readonly NavLink[]};
export type NavigationProps = SurfaceProps & {
  label: string;
  items: readonly NavItem[];
  currentId?: string | null;
  onNavigate?: (item: NavLink) => void;
  renderLink?: (args: {item: NavLink; current: boolean; linkProps: {
    href: string;
    'aria-current'?: 'page';
    onClick: (event: MouseEvent<HTMLElement>) => void;
  }}) => ReactNode;
};

export type MobileSidebarProps =
  | {mobileValue: boolean; defaultMobileValue?: never; onMobileValueChange: (open: boolean) => void}
  | {mobileValue?: never; defaultMobileValue?: boolean; onMobileValueChange?: (open: boolean) => void};
export type SidebarProps = ValueProps<boolean> & MobileSidebarProps & SurfaceProps & {
  label: string;
  children: ReactNode;
  triggerLabel?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const subscribeClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function Sidebar({label, children, value, defaultValue, onValueChange,
  mobileValue, defaultMobileValue, onMobileValueChange, triggerLabel,
  returnFocusRef, className, style, 'data-testid': testId}: SidebarProps) {
  const desktop = useMediaQuery('(min-width: 48rem)');
  const report = useDiagnostics('Sidebar');
  const mounted = useSyncExternalStore(subscribeClient, clientSnapshot, serverSnapshot);
  const [contentHost] = useState(() => typeof document === 'undefined' ? null : document.createElement('div'));
  const [expanded, setExpanded] = useControllableValue({value, defaultValue, onValueChange, fallback: true, report});
  const [mobileOpen, setMobileOpen] = useControllableValue({value: mobileValue, defaultValue: defaultMobileValue, onValueChange: onMobileValueChange, fallback: false, report});
  const [mobileLifecycle, setMobileLifecycle] = useState({desktop, mobileOpen, suppressed: false});
  if (mobileLifecycle.desktop !== desktop || mobileLifecycle.mobileOpen !== mobileOpen) {
    setMobileLifecycle({desktop, mobileOpen, suppressed: mobileOpen && ((desktop && !mobileLifecycle.desktop) || mobileLifecycle.suppressed)});
  }
  const trigger = useRef<HTMLButtonElement>(null);
  const parking = useRef<HTMLDivElement>(null);
  const previousDesktop = useRef(desktop);
  const id = useId();
  useEffect(() => {
    if (desktop && !previousDesktop.current && mobileOpen) {
      setMobileOpen(false);
    }
    previousDesktop.current = desktop;
  }, [desktop, mobileOpen, setMobileOpen]);
  const open = !desktop && mobileOpen && !mobileLifecycle.suppressed;
  // The portal container stays stable while its DOM host moves. React delegates
  // events to that host, retaining both consumer state and event ownership.
  const attachParking = useCallback((slot: HTMLDivElement | null) => {
    parking.current = slot;
    if (slot && contentHost) slot.appendChild(contentHost);
  }, [contentHost]);
  const attachDrawer = useCallback((slot: HTMLDivElement | null) => {
    if (!slot || !contentHost) return;
    slot.appendChild(contentHost);
    return () => { parking.current?.appendChild(contentHost); };
  }, [contentHost]);
  const body = <aside id={id} aria-label={label} className="nova-sidebar__desktop" hidden={desktop ? !expanded : !open}>{children}</aside>;
  return <div className={cx('nova-sidebar', className)} style={style} data-testid={testId} data-expanded={expanded}>
    <button ref={trigger} type="button" className="nova-sidebar__trigger"
      aria-expanded={desktop ? expanded : open} aria-controls={desktop ? id : undefined}
      onClick={() => {
        if (desktop) setExpanded(!expanded);
        else { setMobileLifecycle(current => ({...current, suppressed: false})); setMobileOpen(!open); }
      }}>{triggerLabel ?? label}</button>
    <div ref={attachParking}>{!mounted && body}</div>
    {mounted && contentHost && createPortal(body, contentHost)}
    <Drawer value={open} onValueChange={setMobileOpen} title={label} side="start" returnFocusRef={returnFocusRef ?? trigger}>
      <div ref={attachDrawer} className="nova-sidebar__drawer"/>
    </Drawer>
  </div>;
}

export function Navigation({label, items, currentId, onNavigate, renderLink, className, style, 'data-testid': testId}: NavigationProps) {
  for (const item of items) {
    if ('children' in item && item.children.some(child => 'children' in child)) {
      throw new TypeError('Navigation supports only one level of children');
    }
  }
  const link = (item: NavLink) => {
    const href = sanitizeHref(item.href);
    const content = <>{item.icon && <span aria-hidden="true">{item.icon}</span>}<span>{item.label}</span></>;
    if (item.disabled || href === null) return <span className="nova-navigation__disabled" aria-disabled="true">{content}</span>;
    const current = item.id === currentId;
    const linkProps = {
      href,
      ...(current ? {'aria-current': 'page' as const} : {}),
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.(item);
      },
    };
    return renderLink ? renderLink({item, current, linkProps}) : <a {...linkProps}>{content}</a>;
  };
  return <nav aria-label={label} className={cx('nova-navigation', className)} style={style} data-testid={testId}>
    <ul>{items.map(item => <li key={item.id}>{'children' in item ? <>
      <span className="nova-navigation__group">{item.icon && <span aria-hidden="true">{item.icon}</span>}{item.label}</span>
      <ul aria-label={item.label}>{item.children.map(child => <li key={child.id}>{link(child)}</li>)}</ul>
    </> : link(item)}</li>)}</ul>
  </nav>;
}

export function AppShell({header, sidebar, children, mainId, skipLabel, className, style, 'data-testid': testId}: AppShellProps) {
  const id = useId();
  const main = useRef<HTMLElement>(null);
  const {locale} = useNovaScope();
  const contentId = mainId ?? `nova-main-${id}`;
  return <div className={cx('nova-app-shell', className)} style={style} data-testid={testId}>
    <a className="nova-app-shell__skip" href={`#${contentId}`} onClick={event => {
      event.preventDefault();
      main.current?.focus();
    }}>{skipLabel ?? (locale.startsWith('vi') ? 'Tới nội dung chính' : 'Skip to content')}</a>
    {header !== undefined && <header className="nova-app-shell__header">{header}</header>}
    <div className="nova-app-shell__body">
      {sidebar}
      <main ref={main} id={contentId} tabIndex={-1} className="nova-app-shell__main">{children}</main>
    </div>
  </div>;
}
