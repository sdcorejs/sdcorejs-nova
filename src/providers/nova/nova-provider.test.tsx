import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { vi as viCatalog } from '../../i18n/vi.js';
import { useNovaScope } from './context.js';
import { NovaProvider, ThemeProvider, useNovaTheme } from './index.js';
import { PortalScope } from './portal-scope.js';

type Listener = (event: { matches: boolean }) => void;
let prefersDark = false;
let listeners: Set<Listener>;
let added = 0;
let removed = 0;

beforeEach(() => {
  prefersDark = false;
  listeners = new Set();
  added = 0;
  removed = 0;
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() { return query.includes('dark') ? prefersDark : false; },
    addEventListener: (_type: string, listener: Listener) => { added += 1; listeners.add(listener); },
    removeEventListener: (_type: string, listener: Listener) => { removed += 1; listeners.delete(listener); },
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function ThemeProbe({ log }: { log?: string[] }) {
  const { theme, resolvedTheme } = useNovaTheme();
  log?.push(resolvedTheme);
  return <span data-testid="probe" data-theme={theme} data-resolved={resolvedTheme} />;
}

function ScopeProbe() {
  const scope = useNovaScope();
  return (
    <span data-testid="scope" data-tz={scope.timeZone} data-locale={scope.locale} data-dir={scope.dir ?? ''}
      data-retry={scope.strings.feedback.retry} data-classes={scope.tokenClasses.join(' ')} />
  );
}

describe('NovaProvider scope element (INV-007)', () => {
  it('renders one scope element with nova-theme, consumer classes, data-nova-theme, dir and lang', () => {
    const { container } = render(<NovaProvider theme="dark" locale="en" dir="rtl" className="brand  extra"><i /></NovaProvider>);
    const scope = container.firstElementChild as HTMLElement;
    expect(scope.className).toBe('nova-theme brand extra');
    expect(scope.getAttribute('data-nova-theme')).toBe('dark');
    expect(scope.getAttribute('dir')).toBe('rtl');
    expect(scope.getAttribute('lang')).toBe('en');
    expect(scope.getAttribute('style')).toBeNull();
    expect(container.querySelectorAll('.nova-theme')).toHaveLength(1);
  });

  it('defaults to light, vi, ltr, UTC', () => {
    const { getByTestId, container } = render(<NovaProvider><ScopeProbe /><ThemeProbe /></NovaProvider>);
    expect(container.firstElementChild?.getAttribute('data-nova-theme')).toBe('light');
    expect(getByTestId('scope').dataset).toMatchObject({ tz: 'UTC', locale: 'vi', dir: 'ltr', retry: viCatalog.feedback.retry });
    expect(getByTestId('probe').dataset).toMatchObject({ theme: 'light', resolved: 'light' });
  });

  it('outside any provider: light, vi strings, no dir, no diagnostic', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getByTestId } = render(<><ScopeProbe /><ThemeProbe /></>);
    expect(getByTestId('scope').dataset).toMatchObject({ locale: 'vi', dir: '', retry: viCatalog.feedback.retry, classes: '' });
    expect(getByTestId('probe').dataset).toMatchObject({ theme: 'light', resolved: 'light' });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('system theme (INV-003, S01-AC02)', () => {
  it('system: server and first client render use initialResolvedTheme', () => {
    prefersDark = false;
    const tree = (log?: string[]) => <NovaProvider theme="system" initialResolvedTheme="dark"><ThemeProbe log={log} /></NovaProvider>;
    const html = renderToString(tree());
    expect(html).toContain('data-resolved="dark"');
    expect(html).toContain('data-nova-theme="system"');
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const log: string[] = [];
    const onRecoverableError = vi.fn();
    act(() => { hydrateRoot(container, tree(log), { onRecoverableError }); });
    expect(log[0]).toBe('dark');
    expect(container.querySelector('[data-testid="probe"]')?.getAttribute('data-resolved')).toBe('light');
    expect(container.firstElementChild?.getAttribute('data-nova-theme')).toBe('system');
  });

  it('hydrateRoot reports 0 recoverable errors', () => {
    prefersDark = true;
    const tree = <NovaProvider theme="system" locale="en" dir="rtl" className="brand"><ThemeProbe /><ScopeProbe /></NovaProvider>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => { hydrateRoot(container, tree, { onRecoverableError }); });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="probe"]')?.getAttribute('data-resolved')).toBe('dark');
  });

  it('follows matchMedia changes and removes the listener on unmount', () => {
    const view = render(<NovaProvider theme="system"><ThemeProbe /></NovaProvider>);
    expect(added).toBe(1);
    act(() => { prefersDark = true; for (const listener of listeners) listener({ matches: true }); });
    expect(view.getByTestId('probe').dataset.resolved).toBe('dark');
    view.unmount();
    expect(removed).toBe(1);
    expect(listeners.size).toBe(0);
  });

  it('explicit light/dark never subscribes to matchMedia', () => {
    render(<NovaProvider theme="dark"><ThemeProbe /></NovaProvider>);
    expect(added).toBe(0);
  });
});

describe('nested ThemeProvider (Q-02)', () => {
  it('nested ThemeProvider appends token classes and inherits dir/lang/strings', () => {
    const { getAllByTestId, container } = render(
      <NovaProvider theme="dark" locale="en" dir="rtl" className="brand" strings={{ feedback: { retry: 'Again' } }}>
        <ThemeProvider theme="light" className="inner">
          <ScopeProbe />
          <ThemeProbe />
        </ThemeProvider>
      </NovaProvider>,
    );
    const scopes = container.querySelectorAll('.nova-theme');
    expect(scopes).toHaveLength(2);
    const inner = scopes[1] as HTMLElement;
    expect(inner.className).toBe('nova-theme brand inner');
    expect(inner.getAttribute('data-nova-theme')).toBe('light');
    expect(inner.getAttribute('dir')).toBe('rtl');
    expect(inner.getAttribute('lang')).toBe('en');
    expect(getAllByTestId('scope')[0]!.dataset).toMatchObject({ retry: 'Again', locale: 'en', dir: 'rtl', classes: 'brand inner' });
    expect(getAllByTestId('probe')[0]!.dataset).toMatchObject({ theme: 'light', resolved: 'light' });
    expect((scopes[0] as HTMLElement).getAttribute('data-nova-theme')).toBe('dark');
  });
});

describe('configuration fallbacks', () => {
  it('invalid timeZone falls back to UTC with diagnostic', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getByTestId } = render(<NovaProvider timeZone="Mars/Olympus"><ScopeProbe /></NovaProvider>);
    expect(getByTestId('scope').dataset.tz).toBe('UTC');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('NOVA_INVALID_TIMEZONE');
  });

  it('valid IANA timeZone is kept', () => {
    const { getByTestId } = render(<NovaProvider timeZone="Asia/Ho_Chi_Minh"><ScopeProbe /></NovaProvider>);
    expect(getByTestId('scope').dataset.tz).toBe('Asia/Ho_Chi_Minh');
  });

  it('missing translation falls back to en with one diagnostic per root (S01-AC03)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getAllByTestId } = render(
      <>
        <NovaProvider locale="fr" strings={{ feedback: { retry: 'Réessayer' } }}><ScopeProbe /><ScopeProbe /></NovaProvider>
        <NovaProvider locale="de"><ScopeProbe /></NovaProvider>
      </>,
    );
    expect(getAllByTestId('scope')[0]!.dataset.retry).toBe('Réessayer');
    expect(getAllByTestId('scope')[2]!.dataset.retry).toBe(en.feedback.retry);
    expect(warn.mock.calls.filter(([message]) => String(message).includes('NOVA_MISSING_TRANSLATION'))).toHaveLength(2);
  });
});

describe('private portal scope (§8.3, INV-007)', () => {
  it('portal wrapper is a new child of host and host attributes stay unchanged', () => {
    const host = document.createElement('section');
    host.className = 'host-class';
    host.setAttribute('data-x', '1');
    host.setAttribute('dir', 'ltr');
    document.body.append(host);
    const before = host.outerHTML;
    const view = render(
      <NovaProvider theme="dark" dir="rtl" locale="en" className="brand" portalContainer={host}>
        <ThemeProvider theme="light" className="inner">
          <PortalScope><b data-testid="ported">x</b></PortalScope>
        </ThemeProvider>
      </NovaProvider>,
    );
    const wrapper = host.lastElementChild as HTMLElement;
    expect(wrapper.parentElement).toBe(host);
    expect(wrapper.className).toBe('nova-theme brand inner');
    expect(wrapper.getAttribute('data-nova-theme')).toBe('light');
    expect(wrapper.getAttribute('dir')).toBe('rtl');
    expect(wrapper.getAttribute('lang')).toBe('en');
    expect(wrapper.contains(view.getByTestId('ported'))).toBe(true);
    expect(host.className).toBe('host-class');
    expect(host.getAttribute('data-x')).toBe('1');
    expect(host.getAttribute('dir')).toBe('ltr');
    expect(host.getAttribute('style')).toBeNull();
    view.unmount();
    expect(host.outerHTML).toBe(before);
  });

  it('defaults the host to document.body and renders nothing on the server', () => {
    const html = renderToString(<NovaProvider><PortalScope><b>x</b></PortalScope></NovaProvider>);
    expect(html).not.toContain('<b>');
    const bodyClass = document.body.className;
    render(<NovaProvider theme="dark"><PortalScope><b data-testid="b">x</b></PortalScope></NovaProvider>);
    const wrapper = document.body.querySelector(':scope > .nova-theme[data-nova-theme="dark"]');
    expect(wrapper?.contains(document.querySelector('[data-testid="b"]'))).toBe(true);
    expect(document.body.className).toBe(bodyClass);
  });

  it('two roots sharing a host get separate wrappers', () => {
    const host = document.createElement('div');
    document.body.append(host);
    render(
      <>
        <NovaProvider theme="dark" className="a" portalContainer={host}><PortalScope><b>A</b></PortalScope></NovaProvider>
        <NovaProvider theme="light" className="b" portalContainer={host}><PortalScope><b>B</b></PortalScope></NovaProvider>
      </>,
    );
    const wrappers = [...host.children] as HTMLElement[];
    expect(wrappers).toHaveLength(2);
    expect(wrappers.map((wrapper) => [wrapper.className, wrapper.dataset.novaTheme, wrapper.textContent])).toEqual([
      ['nova-theme a', 'dark', 'A'],
      ['nova-theme b', 'light', 'B'],
    ]);
  });

  it('wrapper follows theme changes without touching the host', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const view = render(<NovaProvider theme="dark" portalContainer={host}><PortalScope><b>x</b></PortalScope></NovaProvider>);
    view.rerender(<NovaProvider theme="light" portalContainer={host}><PortalScope><b>x</b></PortalScope></NovaProvider>);
    expect(host.children).toHaveLength(1);
    expect((host.firstElementChild as HTMLElement).dataset.novaTheme).toBe('light');
    expect(host.attributes).toHaveLength(0);
  });
});

// approved defaults for every scope.
describe('ThemeProvider defaults', () => {
  it('standalone ThemeProvider is a full scope with approved defaults (INV-007)', () => {
    const { container, getByTestId } = render(<ThemeProvider theme="dark" className="island"><ScopeProbe /></ThemeProvider>);
    const scope = container.querySelector('.nova-theme') as HTMLElement;
    expect(scope.className).toBe('nova-theme island');
    expect(scope.getAttribute('data-nova-theme')).toBe('dark');
    expect(scope.getAttribute('dir')).toBe('ltr');
    expect(scope.getAttribute('lang')).toBe('vi');
    expect(getByTestId('scope').dataset).toMatchObject({ locale: 'vi', dir: 'ltr', tz: 'UTC', retry: viCatalog.feedback.retry });
  });

  it('standalone ThemeProvider portals carry dir/lang too', () => {
    render(<ThemeProvider theme="dark"><PortalScope><b>x</b></PortalScope></ThemeProvider>);
    const wrapper = document.body.querySelector(':scope > .nova-theme') as HTMLElement;
    expect(wrapper.getAttribute('dir')).toBe('ltr');
    expect(wrapper.getAttribute('lang')).toBe('vi');
  });

  it('nested system theme seeds from its own initialResolvedTheme ?? light, not the parent (server)', () => {
    const plain = renderToString(<NovaProvider theme="dark"><ThemeProvider theme="system"><ThemeProbe /></ThemeProvider></NovaProvider>);
    expect(plain).toContain('data-resolved="light"');
    const seeded = renderToString(<NovaProvider theme="light"><ThemeProvider theme="system" initialResolvedTheme="dark"><ThemeProbe /></ThemeProvider></NovaProvider>);
    expect(seeded).toContain('data-resolved="dark"');
  });

  it('nested system under a dark parent hydrates cleanly and then follows matchMedia', () => {
    prefersDark = true;
    const tree = (log?: string[]) => <NovaProvider theme="dark"><ThemeProvider theme="system"><ThemeProbe log={log} /></ThemeProvider></NovaProvider>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree());
    document.body.append(container);
    const log: string[] = [];
    const onRecoverableError = vi.fn();
    act(() => { hydrateRoot(container, tree(log), { onRecoverableError }); });
    expect(log[0]).toBe('light');
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="probe"]')?.getAttribute('data-resolved')).toBe('dark');
  });

  it('normalizes the locale tag consistently for lang and context', () => {
    const { container, getByTestId } = render(<NovaProvider locale="en_US"><ScopeProbe /></NovaProvider>);
    expect(container.firstElementChild?.getAttribute('lang')).toBe('en-US');
    expect(getByTestId('scope').dataset.locale).toBe('en-US');
  });
});
