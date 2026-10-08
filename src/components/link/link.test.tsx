import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Link } from './index.js';

afterEach(cleanup);

const UNSAFE = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  ' java\tscript:alert(1)',
  'data:text/html,<b>x</b>',
  'vbscript:msgbox(1)',
  '',
];

describe('Link href allowlist (C06-AC02, INV-010)', () => {
  it.each(UNSAFE)('unsafe href %j renders non-navigating text', (href) => {
    const ref = createRef<HTMLAnchorElement>();
    const { container } = render(<Link ref={ref} href={href}>Mở</Link>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
    expect(container.textContent).toBe('Mở');
    expect(ref.current).toBeNull();
  });

  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['/files/1', '/files/1'],
    ['mailto:an@example.com', 'mailto:an@example.com'],
    ['tel:+84123', 'tel:+84123'],
    ['#section', '#section'],
  ])('safe href %j renders an anchor', (href, expected) => {
    const ref = createRef<HTMLAnchorElement>();
    render(<Link ref={ref} href={href}>Mở</Link>);
    const link = screen.getByRole('link', { name: 'Mở' });
    expect(link.getAttribute('href')).toBe(expected);
    expect(ref.current).toBe(link);
  });

  it('target _blank merges rel noopener noreferrer with consumer tokens', () => {
    render(<Link href="https://x.test" target="_blank" rel="nofollow noopener">Ngoài</Link>);
    const tokens = screen.getByRole('link').getAttribute('rel')!.split(' ');
    expect(tokens.sort()).toEqual(['nofollow', 'noopener', 'noreferrer']);
  });

  it('never sets target on its own and leaves rel alone without _blank', () => {
    render(<Link href="https://x.test" rel="author">A</Link>);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBeNull();
    expect(link.getAttribute('rel')).toBe('author');
  });

  it('forwards native anchor props', () => {
    render(<Link href="/a" hrefLang="vi" download="f.txt" className="mine" aria-describedby="d">A</Link>);
    const link = screen.getByRole('link');
    expect(link.getAttribute('hreflang')).toBe('vi');
    expect(link.getAttribute('download')).toBe('f.txt');
    expect(link.className).toContain('mine');
    expect(link.getAttribute('aria-describedby')).toBe('d');
  });
});
