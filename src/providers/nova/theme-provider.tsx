'use client';
// Theme scope (Q-02, INV-007). Nested: overrides theme for its subtree only,
// appends its token classes to the parent's, inherits locale/dir/strings/portal.
// Standalone (no enclosing provider): a full scope with the approved defaults
// (vi, ltr, UTC). `system` always seeds from its own initialResolvedTheme ?? light.
import { CSPProvider } from '@base-ui/react/csp-provider';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { useMemo, type ReactNode } from 'react';

import { cx } from '../../lib/cx.js';
import { NovaContext, splitClasses, useNovaScope, type NovaScope, type NovaTheme } from './context.js';
import { useResolvedTheme } from './use-nova-theme.js';

export type ThemeProviderProps = {
  children: ReactNode;
  theme: NovaTheme;
  initialResolvedTheme?: 'light' | 'dark';
  className?: string;
};

export function ThemeProvider({ children, theme, initialResolvedTheme, className }: ThemeProviderProps) {
  const parent = useNovaScope();
  const standalone = !parent.inProvider;
  const resolvedTheme = useResolvedTheme(theme, initialResolvedTheme ?? 'light');
  const tokenClasses = useMemo(() => [...parent.tokenClasses, ...splitClasses(className)], [parent.tokenClasses, className]);
  const scope = useMemo<NovaScope>(
    () => ({
      ...parent,
      ...(standalone ? { locale: 'vi', dir: 'ltr' as const, inProvider: true } : {}),
      theme,
      resolvedTheme,
      tokenClasses,
    }),
    [parent, standalone, theme, resolvedTheme, tokenClasses],
  );
  const element = (
    <div className={cx('nova-theme', ...tokenClasses)} data-nova-theme={theme} dir={scope.dir} lang={scope.locale}>
      {children}
    </div>
  );
  return (
    <NovaContext.Provider value={scope}>
      {standalone ? (
        <CSPProvider disableStyleElements>
          <DirectionProvider direction="ltr">{element}</DirectionProvider>
        </CSPProvider>
      ) : element}
    </NovaContext.Provider>
  );
}
