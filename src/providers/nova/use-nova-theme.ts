'use client';
import { useEffect, useState } from 'react';

import { useNovaScope, type NovaTheme } from './context.js';

/** Theme of the nearest scope; `resolvedTheme` for `system` is only exact after mount. */
export function useNovaTheme(): { theme: NovaTheme; resolvedTheme: 'light' | 'dark' } {
  const { theme, resolvedTheme } = useNovaScope();
  return { theme, resolvedTheme };
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Server and first client render use `initial` (INV-003); `system` subscribes to
 * matchMedia only after mount and removes the listener on cleanup (S01-AC02).
 */
export function useResolvedTheme(theme: NovaTheme, initial: 'light' | 'dark' | undefined): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(initial ?? 'light');
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const query = window.matchMedia(DARK_QUERY);
    const update = () => setSystemTheme(query.matches ? 'dark' : 'light');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [theme]);
  return theme === 'system' ? systemTheme : theme;
}
