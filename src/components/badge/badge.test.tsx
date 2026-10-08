import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Badge } from './index.js';

afterEach(cleanup);

describe('Badge (C04)', () => {
  it('0 is rendered and never hidden', () => {
    const { container } = render(<Badge>{0}</Badge>);
    expect(container.textContent).toBe('0');
    expect(container.firstElementChild?.getAttribute('hidden')).toBeNull();
  });

  it('Badge has no role alert (or any live role) by default, even for tone error', () => {
    const { container } = render(<Badge tone="error">Lỗi</Badge>);
    const badge = container.firstElementChild!;
    expect(badge.getAttribute('role')).toBeNull();
    expect(badge.getAttribute('aria-live')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['neutral', 'success', 'warning', 'error', 'info'] as const)('tone %s is exposed as text plus optional decorative icon', (tone) => {
    const { container } = render(<Badge tone={tone} icon={<svg data-testid="icon" />}>Trạng thái</Badge>);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain(`nova-badge--${tone}`);
    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(badge.textContent).toBe('Trạng thái');
  });

  it('defaults to neutral, forwards ref and surface props, is not focusable', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref} className="mine" data-testid="b" style={{ marginInlineStart: 4 }}>x</Badge>);
    const badge = screen.getByTestId('b');
    expect(ref.current).toBe(badge);
    expect(badge.tagName).toBe('SPAN');
    expect(badge.className).toContain('nova-badge--neutral');
    expect(badge.className).toContain('mine');
    expect(badge.getAttribute('tabindex')).toBeNull();
    expect(badge.style.marginInlineStart).toBe('4px');
  });
});
