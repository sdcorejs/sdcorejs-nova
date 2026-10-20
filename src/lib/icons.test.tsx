import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Icon } from './icons.js';

describe('Icon (design round 2, internal)', () => {
  it('renders a decorative 16×16 SVG with no text content', () => {
    const { container } = render(<Icon name="chevron-down" className="nova-select__chevron" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(svg?.getAttribute('class')).toBe('nova-icon nova-select__chevron');
    expect(container.textContent).toBe('');
  });

  it('is deterministic on the server', () => {
    expect(renderToStaticMarkup(<Icon name="close" />)).toBe(renderToStaticMarkup(<Icon name="close" />));
  });
});
