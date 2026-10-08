'use client';
// Root Nova scope (S01, §7, INV-001/003/007): one scope element carrying
// `nova-theme` + consumer token classes, data-nova-theme, dir and lang. All
// state belongs to this instance; nothing is shared between roots.
import { CSPProvider } from '@base-ui/react/csp-provider';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { normalizeLocale, resolveStrings } from '../../i18n/resolve-strings.js';
import type { NovaStringOverrides } from '../../i18n/strings.js';
import { cx } from '../../lib/cx.js';
import { createDiagnosticOwner, reportDiagnostic } from '../../lib/diagnostics.js';
import { NovaContext, splitClasses, type NovaScope, type NovaTheme } from './context.js';
import { useResolvedTheme } from './use-nova-theme.js';

export type NovaProviderProps = {
  children: ReactNode;
  locale?: 'vi' | 'en' | (string & {});
  timeZone?: string;
  dir?: 'ltr' | 'rtl';
  theme?: NovaTheme;
  initialResolvedTheme?: 'light' | 'dark';
  strings?: NovaStringOverrides;
  portalContainer?: HTMLElement | null;
  /** Consumer token classes; they follow nested scopes and portal wrappers (§8.3). */
  className?: string;
};

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function NovaProvider({
  children,
  locale = 'vi',
  timeZone = 'UTC',
  dir = 'ltr',
  theme = 'light',
  initialResolvedTheme,
  strings: overrides,
  portalContainer,
  className,
}: NovaProviderProps) {
  const [diagnostics] = useState(createDiagnosticOwner);
  const resolvedTheme = useResolvedTheme(theme, initialResolvedTheme);
  const timeZoneValid = isValidTimeZone(timeZone);

  useEffect(() => {
    if (!timeZoneValid) reportDiagnostic(diagnostics, 'NOVA_INVALID_TIMEZONE', 'NovaProvider');
  }, [timeZoneValid, diagnostics]);

  const resolved = useMemo(() => resolveStrings({ locale, overrides, owner: diagnostics }), [locale, overrides, diagnostics]);
  // one canonical tag for lang, context and Intl (`en_US` → `en-US`; malformed → en, like the strings)
  const tag = normalizeLocale(locale) ?? 'en';
  const tokenClasses = useMemo(() => splitClasses(className), [className]);

  const scope = useMemo<NovaScope>(() => ({
    theme,
    resolvedTheme,
    locale: tag,
    dir,
    timeZone: timeZoneValid ? timeZone : 'UTC',
    strings: resolved.strings,
    tokenClasses,
    portalContainer,
    diagnostics,
    inProvider: true,
  }), [theme, resolvedTheme, tag, dir, timeZoneValid, timeZone, resolved, tokenClasses, portalContainer, diagnostics]);

  return (
    <NovaContext.Provider value={scope}>
      {/* Nova never injects <style>/<script> (INV-014); Base UI style elements are disabled. */}
      <CSPProvider disableStyleElements>
        <DirectionProvider direction={dir}>
          <div className={cx('nova-theme', ...tokenClasses)} data-nova-theme={theme} dir={dir} lang={tag}>
            {children}
          </div>
        </DirectionProvider>
      </CSPProvider>
    </NovaContext.Provider>
  );
}
