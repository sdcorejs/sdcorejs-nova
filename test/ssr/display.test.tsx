import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Badge } from '../../src/components/badge/index.js';
import { Card, CardGroup, Section, SectionItem } from '../../src/components/card/index.js';
import { Empty } from '../../src/components/data-state/empty.js';
import { Skeleton } from '../../src/components/data-state/skeleton.js';

const SERVER_COMPATIBLE = [
  'src/components/badge/badge.tsx',
  'src/components/card/card.tsx',
  'src/components/card/section.tsx',
  'src/components/data-state/empty.tsx',
  'src/components/data-state/skeleton.tsx',
];

const source = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

describe('server-compatible display components (D-014, INV-002, INV-011)', () => {
  it.each(SERVER_COMPATIBLE)('%s has no directive, no hooks/context and no provider import', (file) => {
    const text = source(file);
    expect(text).not.toMatch(/^\s*['"]use client['"]/m);
    expect(text).not.toMatch(/\buse(State|Effect|LayoutEffect|Context|Ref|Id|Memo|Callback|Reducer|SyncExternalStore)\b/);
    expect(text).not.toMatch(/providers\//);
    expect(text).not.toMatch(/@base-ui\//);
  });

  it('server-compatible modules render without provider', () => {
    const html = renderToString(
      <CardGroup>
        <Card>
          <Section title="Tiêu đề" headingLevel={3} description="Mô tả" actions={<a href="/x">Xem</a>}>
            <SectionItem><Badge tone="success">{0}</Badge></SectionItem>
          </Section>
        </Card>
        <Empty title="Trống" />
        <Skeleton />
      </CardGroup>,
    );
    expect(html).toContain('<h3');
    expect(html).toContain('>0<');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/role="alert"|<script|<style|nova-theme/);
  });

  it('0 is rendered', () => {
    expect(renderToString(<Badge>{0}</Badge>)).toMatch(/>0</);
  });

  it('Badge has no role alert', () => {
    expect(renderToString(<Badge tone="error">x</Badge>)).not.toContain('role=');
  });

  it('headingLevel renders h2/h3/h4', () => {
    for (const level of [2, 3, 4] as const) {
      expect(renderToString(<Section title="t" headingLevel={level}>b</Section>)).toContain(`<h${level}`);
    }
  });

  it('Skeleton is aria-hidden', () => {
    expect(renderToString(<Skeleton shape="text" />)).toContain('aria-hidden="true"');
  });
});
