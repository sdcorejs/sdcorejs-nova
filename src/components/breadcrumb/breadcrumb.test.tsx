import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { vi as viCatalog } from '../../i18n/vi.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Breadcrumb, type BreadcrumbItem } from './index.js';

afterEach(cleanup);

const ITEMS: BreadcrumbItem[] = [
  { id: 'home', label: 'Trang chủ', href: '/' },
  { id: 'docs', label: 'Tài liệu', href: '/docs' },
  { id: 'files', label: 'Tệp', href: '/docs/files' },
  { id: 'year', label: '2026', href: '/docs/files/2026' },
  { id: 'current', label: 'Báo cáo', href: '/docs/files/2026/report' },
];

describe('Breadcrumb structure (C06-AC01)', () => {
  it('nav with aria-label and ol', () => {
    render(<Breadcrumb items={ITEMS.slice(0, 2)} />);
    const nav = screen.getByRole('navigation', { name: viCatalog.navigation.breadcrumb });
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('uses the localized default label or the consumer label', () => {
    const view = render(<NovaProvider locale="en"><Breadcrumb items={ITEMS.slice(0, 2)} /></NovaProvider>);
    expect(screen.getByRole('navigation', { name: en.navigation.breadcrumb })).toBeTruthy();
    view.rerender(<Breadcrumb items={ITEMS.slice(0, 2)} label="Vị trí" />);
    expect(screen.getByRole('navigation', { name: 'Vị trí' })).toBeTruthy();
  });

  it('last item aria-current page without href (never href="#")', () => {
    const { container } = render(<Breadcrumb items={ITEMS.slice(0, 3)} />);
    const current = screen.getByText('Tệp');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.closest('a')).toBeNull();
    expect(container.querySelector('[href="#"]')).toBeNull();
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/', '/docs']);
  });

  it('empty items render nothing', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('separators are decorative', () => {
    const { container } = render(<Breadcrumb items={ITEMS.slice(0, 3)} />);
    const separators = container.querySelectorAll('.nova-breadcrumb__separator');
    expect(separators.length).toBe(2);
    for (const separator of separators) expect(separator.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('renderLink and unsafe hrefs (C06-AC02)', () => {
  it('renderLink only for safe hrefs, never for the current item', () => {
    const renderLink = vi.fn((item: BreadcrumbItem) => <a href={item.href} data-router="">{item.label}</a>);
    const items: BreadcrumbItem[] = [
      { id: 'a', label: 'An toàn', href: '/a' },
      { id: 'b', label: 'Nguy hiểm', href: 'javascript:alert(1)' },
      { id: 'c', label: 'Không href' },
      { id: 'd', label: 'Hiện tại', href: '/d' },
    ];
    const { container } = render(<Breadcrumb items={items} renderLink={renderLink} />);
    expect(renderLink.mock.calls.map(([item]) => item.id)).toEqual(['a']);
    expect(container.querySelectorAll('[data-router]')).toHaveLength(1);
    expect(screen.getByText('Nguy hiểm').closest('a')).toBeNull();
    expect(container.querySelector('[href^="javascript"]')).toBeNull();
    expect(screen.getByText('Không href').closest('a')).toBeNull();
  });
});

describe('collapse (C06-AC03, Q-08)', () => {
  it('collapsed disclosure aria-expanded expands inline without a popup', async () => {
    const user = userEvent.setup();
    const { container } = render(<Breadcrumb items={ITEMS} />);
    const toggle = screen.getByRole('button', { name: viCatalog.navigation.showHidden });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const controlled = toggle.getAttribute('aria-controls');
    expect(controlled).toBeTruthy();
    expect(container.querySelector(`[id="${controlled}"]`)?.tagName).toBe('OL');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('nav')?.hasAttribute('data-expanded')).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(ITEMS.length);
  });

  it('three or fewer items have no disclosure', () => {
    render(<Breadcrumb items={ITEMS.slice(0, 3)} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
