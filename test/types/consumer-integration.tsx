'use client';
// Consumer integration example. Every
// import goes through the package `exports` map (packaged .d.ts), never src.
// Code between `// #region <name>` and `// #endregion <name>` is copied verbatim
// into docs/nova/p0-integration.vi.md; keep both in sync.
// Run with the pinned TypeScript and 5.7: `npm run typecheck:fixtures`.

// #region imports
import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@sdcorejs/nova/button';
import { Card, Section } from '@sdcorejs/nova/card';
import { NovaProvider, ThemeProvider, useNovaTheme } from '@sdcorejs/nova/theme';
// #endregion imports

// #region app-root
export function AppRoot({ initialResolvedTheme, children }: { initialResolvedTheme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <NovaProvider theme="system" initialResolvedTheme={initialResolvedTheme} locale="vi" dir="ltr" className="brand-tokens">
      <div className="app-surface">{children}</div>
    </NovaProvider>
  );
}
// #endregion app-root

// #region dark-island
export function DarkIsland({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme="dark">
      <div className="app-surface">{children}</div>
    </ThemeProvider>
  );
}
// #endregion dark-island

// #region theme-status
export function ThemeStatus() {
  const { theme, resolvedTheme } = useNovaTheme();
  return <p>Theme: {theme} → {resolvedTheme}</p>;
}
// #endregion theme-status

// #region themed-portal
const subscribe = () => () => {};
const getBody = () => document.body;
const getServerBody = () => null;

export function ThemedPortal({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme } = useNovaTheme();
  const body = useSyncExternalStore(subscribe, getBody, getServerBody);
  if (!body) return null;
  return createPortal(
    <ThemeProvider theme={theme} initialResolvedTheme={resolvedTheme}>
      <div className="app-surface app-overlay">{children}</div>
    </ThemeProvider>,
    body,
  );
}
// #endregion themed-portal

// #region page
export function Page({ initialResolvedTheme }: { initialResolvedTheme: 'light' | 'dark' }) {
  return (
    <AppRoot initialResolvedTheme={initialResolvedTheme}>
      <ThemeStatus />
      <Card>
        <Section title="Tài khoản" actions={<Button>Lưu</Button>}>
          Nội dung nằm trên bề mặt do ứng dụng tô theo theme gốc.
        </Section>
      </Card>
      <DarkIsland>
        <Button variant="secondary">Nút trong island tối</Button>
      </DarkIsland>
      <ThemedPortal>
        <Button>Nút trong portal</Button>
      </ThemedPortal>
    </AppRoot>
  );
}
// #endregion page

// ---------------------------------------------------------------- negatives
// @ts-expect-error ThemeProvider requires theme
export const islandWithoutTheme = <ThemeProvider><div className="app-surface" /></ThemeProvider>;

// @ts-expect-error initialResolvedTheme is 'light' | 'dark' only
export const systemInitial = <NovaProvider theme="system" initialResolvedTheme="system"><i /></NovaProvider>;

// @ts-expect-error resolvedTheme is never 'system'
export const resolvedSystem: ReturnType<typeof useNovaTheme>['resolvedTheme'] = 'system';

// @ts-expect-error useNovaTheme exposes no setter
export const useMissingSetter = () => useNovaTheme().setTheme('dark');

// @ts-expect-error the internal portal scope is not a public export
export { PortalScope as InternalPortalScope } from '@sdcorejs/nova/theme';

// @ts-expect-error the internal portal module is outside the exports map
export * as internalPortalModule from '@sdcorejs/nova/providers/nova/portal-scope';

// @ts-expect-error src/** is outside the exports map
export * as internalSource from '@sdcorejs/nova/src/providers/nova/index.js';
