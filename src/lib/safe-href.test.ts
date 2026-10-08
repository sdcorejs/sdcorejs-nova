import { describe, expect, it } from 'vitest';

import { sanitizeHref } from './safe-href.js';

describe('sanitizeHref payload table (INV-010)', () => {
  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['  javascript:alert(1)'],
    ['\u0001javascript:alert(1)'],
    ['\u0000javascript:alert(1)'],
    ['java\tscript:alert(1)'],
    ['java\nscript:alert(1)'],
    ['java\rscript:alert(1)'],
    ['javascript\t:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['DATA:text/html;base64,PHNjcmlwdD4='],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
    ['blob:https://example.com/uuid'],
    [''],
    ['   '],
  ])('rejects %j', (href) => {
    expect(sanitizeHref(href)).toBeNull();
  });

  it.each([
    ['https://example.com/a?b=1#c', 'https://example.com/a?b=1#c'],
    ['HTTP://EXAMPLE.COM', 'HTTP://EXAMPLE.COM'],
    ['mailto:an@example.com', 'mailto:an@example.com'],
    ['tel:+84123456789', 'tel:+84123456789'],
    ['/files/1', '/files/1'],
    ['./relative', './relative'],
    ['../up', '../up'],
    ['#section', '#section'],
    ['?q=1', '?q=1'],
    ['files/javascript:not-a-scheme', 'files/javascript:not-a-scheme'],
    ['  /trimmed  ', '/trimmed'],
    ['/a\tb', '/ab'],
  ])('allows %j', (href, expected) => {
    expect(sanitizeHref(href)).toBe(expected);
  });
});
