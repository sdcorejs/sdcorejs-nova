import { readdirSync } from 'node:fs';
import { Suspense, use, type ReactNode } from 'react';
import { renderToReadableStream, renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NovaProvider, useNovaTheme } from '../../src/providers/nova/index.js';
import { useNovaScope } from '../../src/providers/nova/context.js';

function Probe({ gate }: { gate?: Promise<string> }) {
  const label = gate ? use(gate) : 'sync';
  const { theme, resolvedTheme } = useNovaTheme();
  const scope = useNovaScope();
  return <p data-label={label} data-theme={theme} data-resolved={resolvedTheme} data-locale={scope.locale}>{scope.strings.feedback.retry}</p>;
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

const delay = (ms: number, value: string) => new Promise<string>((resolve) => setTimeout(() => resolve(value), ms));

function Root({ children, ...props }: { children: ReactNode; theme: 'dark' | 'light'; locale: string }) {
  return <NovaProvider {...props}><Suspense fallback={<i>…</i>}>{children}</Suspense></NovaProvider>;
}

describe('provider SSR (INV-001, INV-002, S01-AC01/AC02)', () => {
  it('runs in a node environment without DOM globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('every provider module imports in node without DOM globals', async () => {
    const dir = new URL('../../src/providers/nova/', import.meta.url);
    const modules = readdirSync(dir).filter((file) => /\.tsx?$/.test(file) && !file.includes('.test.'));
    expect(modules.sort()).toEqual(['context.ts', 'index.ts', 'nova-provider.tsx', 'portal-scope.tsx', 'theme-provider.tsx', 'use-nova-theme.ts']);
    for (const file of modules) {
      const loaded = (await import(new URL(file, dir).href)) as Record<string, unknown>;
      expect(Object.keys(loaded).length, file).toBeGreaterThan(0);
    }
  });

  it('two concurrent renderToString roots dark/vi and light/en are isolated', async () => {
    const [dark, light] = await Promise.all([
      renderToReadableStream(<Root theme="dark" locale="vi"><Probe gate={delay(30, 'A')} /></Root>).then(async (stream) => {
        await stream.allReady;
        return streamToString(stream);
      }),
      renderToReadableStream(
        <Root theme="light" locale="en"><Probe gate={delay(5, 'B')} /></Root>,
      ).then(async (stream) => {
        await stream.allReady;
        return streamToString(stream);
      }),
    ]);
    expect(dark).toContain('data-nova-theme="dark"');
    expect(dark).toContain('lang="vi"');
    expect(dark).toContain('data-resolved="dark"');
    expect(dark).toContain('Thử lại');
    expect(dark).not.toContain('Retry');
    expect(light).toContain('data-nova-theme="light"');
    expect(light).toContain('lang="en"');
    expect(light).toContain('data-resolved="light"');
    expect(light).toContain('Retry');
    expect(light).not.toContain('Thử lại');
  });

  it('server markup for system uses initialResolvedTheme and emits no inline style or script', () => {
    const html = renderToString(<NovaProvider theme="system" initialResolvedTheme="dark" className="brand"><Probe /></NovaProvider>);
    expect(html).toContain('class="nova-theme brand"');
    expect(html).toContain('data-nova-theme="system"');
    expect(html).toContain('data-resolved="dark"');
    expect(html).not.toMatch(/<script|<style|style="/);
  });
});

// standalone and nested scopes on the server.
import { ThemeProvider } from '../../src/providers/nova/index.js';

describe('ThemeProvider SSR defaults', () => {
  it('standalone ThemeProvider renders dir and lang on the server', () => {
    const html = renderToString(<ThemeProvider theme="light"><Probe /></ThemeProvider>);
    expect(html).toMatch(/<div class="nova-theme" data-nova-theme="light" dir="ltr" lang="vi">/);
  });

  it('nested system theme under a dark parent renders light on the server unless seeded', () => {
    expect(renderToString(<NovaProvider theme="dark"><ThemeProvider theme="system"><Probe /></ThemeProvider></NovaProvider>)).toContain('data-resolved="light"');
  });
});
