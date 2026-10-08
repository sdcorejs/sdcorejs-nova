import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Avatar, AvatarGroup } from '../../src/components/avatar/index.js';
import { initials } from '../../src/lib/graphemes.js';
import { NovaProvider } from '../../src/providers/nova/index.js';

const NAMES = ['Nguyễn An', '👨‍👩‍👧 Gia đình', 'đặng ánh', `E${String.fromCodePoint(0x0301)}lise`, '🇻🇳 Việt Nam'];

describe('Avatar SSR (C03-AC03, INV-003)', () => {
  it.each(NAMES)('server initials for %j equal the grapheme initials used on the client', (name) => {
    const html = renderToString(<Avatar name={name} src="/x.png" />);
    expect(html).toContain(`>${initials(name)}<`);
    expect(html).not.toContain('<img');
  });

  it('server markup is deterministic and never emits inline style or script', () => {
    const tree = <NovaProvider><AvatarGroup label="g" max={2}>{NAMES.map((name) => <Avatar key={name} name={name} />)}</AvatarGroup></NovaProvider>;
    const html = renderToString(tree);
    expect(renderToString(tree)).toBe(html);
    expect(html).toContain('+3');
    expect(html).not.toMatch(/<script|<style|style="/);
  });
});
