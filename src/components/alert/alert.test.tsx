import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axe from 'axe-core';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { vi as viCatalog } from '../../i18n/vi.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Alert } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('live semantics (C09-AC01)', () => {
  it('live off has no live role, even for a static error', () => {
    const { container } = render(<Alert tone="error" title="Không lưu được">Thử lại sau.</Alert>);
    const alert = container.firstElementChild!;
    expect(alert.getAttribute('role')).toBeNull();
    expect(alert.getAttribute('aria-live')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('polite → status', () => {
    render(<Alert live="polite" title="Đã lưu" />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('assertive → alert', () => {
    render(<Alert live="assertive" tone="error" title="Mất kết nối" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('rerender keeps the same live node', () => {
    const ref = createRef<HTMLDivElement>();
    const view = render(<Alert ref={ref} live="polite">Bước 1</Alert>);
    const node = screen.getByRole('status');
    expect(ref.current).toBe(node);
    view.rerender(<Alert ref={ref} live="polite">Bước 2</Alert>);
    expect(screen.getByRole('status')).toBe(node);
    expect(node.textContent).toContain('Bước 2');
  });
});

describe('dismiss (C09-AC02)', () => {
  it('dismiss calls onDismiss once per activation (mouse, Enter, Space) and never self-hides', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Alert title="Thông báo" onDismiss={onDismiss} />);
    const button = screen.getByRole('button', { name: viCatalog.feedback.dismiss });
    await user.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    button.focus();
    await user.keyboard('{Enter}');
    expect(onDismiss).toHaveBeenCalledTimes(2);
    await user.keyboard(' ');
    expect(onDismiss).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Thông báo')).toBeTruthy();
  });

  it('dismiss button name is localized and absent without onDismiss', () => {
    const view = render(<NovaProvider locale="en"><Alert title="x" onDismiss={() => {}} /></NovaProvider>);
    expect(screen.getByRole('button', { name: en.feedback.dismiss })).toBeTruthy();
    view.rerender(<Alert title="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('content variants (C09-AC03)', () => {
  it('renders only the parts that are provided (no empty containers)', () => {
    const { container } = render(<Alert title="Chỉ tiêu đề" />);
    expect(container.querySelector('.nova-alert__body')).toBeNull();
    expect(container.querySelector('.nova-alert__actions')).toBeNull();
    expect(container.querySelector('.nova-alert__title')?.textContent).toBe('Chỉ tiêu đề');
  });

  it('action-only without name emits diagnostic', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Alert actions={<button type="button">Hoàn tác</button>} />);
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_ALERT_UNNAMED'))).toBe(true);
  });

  it('action-only with aria-label is a named group and emits nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Alert aria-label="Đã xoá 3 tệp" actions={<button type="button">Hoàn tác</button>} />);
    expect(screen.getByRole('group', { name: 'Đã xoá 3 tệp' })).toBeTruthy();
    expect(warn).not.toHaveBeenCalled();
  });

  it('title or body alone emits no diagnostic', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<><Alert title="t" /><Alert>body</Alert></>);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['tip', 'info', 'success', 'warning', 'error'] as const)('tone %s has a decorative icon', (tone) => {
    const { container } = render(<Alert tone={tone} title="t" />);
    expect(container.firstElementChild?.className).toContain(`nova-alert--${tone}`);
    expect(container.querySelector('.nova-alert__icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <NovaProvider>
        <Alert title="A" onDismiss={() => {}}>B</Alert>
        <Alert live="polite" tone="success" title="Lưu" />
        <Alert aria-label="Hoàn tác" actions={<button type="button">Hoàn tác</button>} />
      </NovaProvider>,
    );
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

// known-empty content is not content.
describe('Alert empty presence', () => {
  const hasUnnamed = (warn: { mock: { calls: unknown[][] } }) =>
    warn.mock.calls.some(([message]) => String(message).includes('NOVA_ALERT_UNNAMED'));

  it.each([['   '], [[]], [true], [<></>], [<span key="s" />]])('title %j is absent: no title box, action-only diagnostic', (title) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Alert title={title} actions={<button type="button">Hoàn tác</button>} />);
    expect(container.querySelector('.nova-alert__title')).toBeNull();
    expect(hasUnnamed(warn)).toBe(true);
  });

  it.each([['  '], [[]], [false]])('body %j is absent: no body box', (body) => {
    const { container } = render(<Alert title="T">{body}</Alert>);
    expect(container.querySelector('.nova-alert__body')).toBeNull();
  });

  it('0 is visible content for title and body and names the alert content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Alert title={0} actions={<button type="button">x</button>}>{0}</Alert>);
    expect(container.querySelector('.nova-alert__title')?.textContent).toBe('0');
    expect(container.querySelector('.nova-alert__body')?.textContent).toBe('0');
    expect(hasUnnamed(warn)).toBe(false);
  });

  it('whitespace actions are not an action area', () => {
    const { container } = render(<Alert title="T" actions="  " />);
    expect(container.querySelector('.nova-alert__actions')).toBeNull();
  });
});
