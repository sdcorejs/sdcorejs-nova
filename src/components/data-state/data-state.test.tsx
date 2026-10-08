import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { vi as viCatalog } from '../../i18n/vi.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { DataState, Empty, Progress, Skeleton, Spinner } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DataState states (C10-AC01, C10-AC02)', () => {
  it('0/false children never inferred empty', () => {
    const view = render(<DataState state="ready">{0}</DataState>);
    expect(view.container.textContent).toBe('0');
    view.rerender(<DataState state="ready">{false}</DataState>);
    expect(screen.queryByText(viCatalog.feedback.empty)).toBeNull();
    expect(view.container.textContent).toBe('');
  });

  it('idle renders nothing', () => {
    const { container } = render(<DataState state="idle"><p>data</p></DataState>);
    expect(container.innerHTML).toBe('');
  });

  it('initial loading has aria-busy and status, no empty', () => {
    const { container } = render(<DataState state="loading"><p>data</p></DataState>);
    expect(container.firstElementChild?.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain(viCatalog.feedback.loading);
    expect(screen.queryByText(viCatalog.feedback.empty)).toBeNull();
    expect(screen.queryByText('data')).toBeNull();
  });

  it('refreshing keeps child node identity and focus', async () => {
    const user = userEvent.setup();
    const view = render(<DataState state="ready"><input aria-label="search" /></DataState>);
    const input = screen.getByRole('textbox');
    await user.click(input);
    view.rerender(<DataState state="ready" refreshing><input aria-label="search" /></DataState>);
    expect(screen.getByRole('textbox')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole('status').textContent).toContain(viCatalog.feedback.refreshing);
    view.rerender(<DataState state="ready"><input aria-label="search" /></DataState>);
    expect(screen.getByRole('textbox')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('empty renders Empty without retry, with message or the localized default', () => {
    const onRetry = vi.fn();
    const view = render(<NovaProvider locale="en"><DataState state="empty" onRetry={onRetry} /></NovaProvider>);
    expect(screen.getByText(en.feedback.empty)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<DataState state="empty" message="Chưa có đơn hàng" />);
    expect(screen.getByText('Chưa có đơn hàng')).toBeTruthy();
  });
});

describe('DataState error and retry (C10-AC03, INV-008)', () => {
  it('error without onRetry has no button and shows the safe message', () => {
    const view = render(<DataState state="error" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(viCatalog.feedback.errorDefault)).toBeTruthy();
    view.rerender(<DataState state="error" message="Không tải được danh sách" />);
    expect(screen.getByText('Không tải được danh sách')).toBeTruthy();
  });

  it('retry calls onRetry once per activation', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<DataState state="error" onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: viCatalog.feedback.retry });
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
    button.focus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('retryPending true suppresses activation and keeps focus', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const view = render(<DataState state="error" onRetry={onRetry} />);
    const button = screen.getByRole('button');
    await user.click(button);
    view.rerender(<DataState state="error" onRetry={onRetry} retryPending />);
    expect(screen.getByRole('button')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    await user.click(button);
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('repeated failure: pending false with state still error accepts a second retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const view = render(<DataState state="error" onRetry={onRetry} />);
    await user.click(screen.getByRole('button'));
    view.rerender(<DataState state="error" onRetry={onRetry} retryPending />);
    view.rerender(<DataState state="error" onRetry={onRetry} retryPending={false} />);
    await user.click(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});

describe('Spinner', () => {
  it('Spinner is a status with text', () => {
    const view = render(<Spinner />);
    expect(screen.getByRole('status').textContent).toBe(viCatalog.feedback.loading);
    view.rerender(<Spinner label="Đang gửi" size="lg" />);
    expect(screen.getByRole('status').textContent).toBe('Đang gửi');
    expect(screen.getByRole('status').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Progress (C10-AC03, §11)', () => {
  const bar = () => screen.getByRole('progressbar', { name: 'Tải lên' });

  it('determinate exposes min/max/now', () => {
    render(<Progress label="Tải lên" value={30} />);
    expect(bar().getAttribute('aria-valuemin')).toBe('0');
    expect(bar().getAttribute('aria-valuemax')).toBe('100');
    expect(bar().getAttribute('aria-valuenow')).toBe('30');
  });

  it.each([[undefined], [null]])('value %s → indeterminate without aria-valuenow and without diagnostic', (value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Progress label="Tải lên" value={value} />);
    expect(bar().hasAttribute('aria-valuenow')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('value %s → indeterminate with diagnostic', (value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Progress label="Tải lên" value={value} />);
    expect(bar().hasAttribute('aria-valuenow')).toBe(false);
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_PROGRESS_INVALID_VALUE'))).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -5])('max %s → 100 with diagnostic', (max) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Progress label="Tải lên" value={50} max={max} />);
    expect(bar().getAttribute('aria-valuemax')).toBe('100');
    expect(bar().getAttribute('aria-valuenow')).toBe('50');
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_PROGRESS_INVALID_MAX'))).toBe(true);
  });

  it('clamps -5 → 0 and 150 → max', () => {
    const view = render(<Progress label="Tải lên" value={-5} />);
    expect(bar().getAttribute('aria-valuenow')).toBe('0');
    view.rerender(<Progress label="Tải lên" value={150} max={120} />);
    expect(bar().getAttribute('aria-valuenow')).toBe('120');
    expect(bar().getAttribute('aria-valuemax')).toBe('120');
  });

  it('DOM never contains NaN or Infinity', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <>
        {[Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, undefined, null, -1, 1e9].map((value, index) => (
          <Progress key={index} label={`p${index}`} value={value} max={index % 2 ? Number.NaN : Number.POSITIVE_INFINITY} />
        ))}
      </>,
    );
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('never emits a style attribute of its own (INV-014)', () => {
    const { container } = render(<><Progress label="a" value={40} /><Progress label="b" /></>);
    expect(container.querySelector('[style]')).toBeNull();
  });
});

describe('re-exported display parts', () => {
  it('Empty and Skeleton are available from ./data-state', () => {
    render(<><Empty title="Trống" /><Skeleton /></>);
    expect(screen.getByText('Trống')).toBeTruthy();
  });
});
