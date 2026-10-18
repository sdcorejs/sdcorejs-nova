'use client';
import { useEffect, useMemo, useState } from 'react';

import { en } from '../../i18n/en.js';
import { languageOf, normalizeLocale } from '../../i18n/resolve-strings.js';
import { vi } from '../../i18n/vi.js';
import { formatRelative, parseISODate, parseISOInstant, type RelativeUnit } from '../../lib/civil-date.js';
import { reportDiagnostic } from '../../lib/diagnostics.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { ISODate, ISOInstant } from '../../types/temporal.js';

function intlLocale(locale: string): string {
  const tag = normalizeLocale(locale);
  return tag && Intl.NumberFormat.supportedLocalesOf(tag).length ? tag : 'en';
}
function fallback(locale: string): string { return languageOf(locale) === 'vi' ? vi.feedback.unavailable : en.feedback.unavailable; }

export function useFormatter(options?: {timeZone?: string}) {
  const scope = useNovaScope(), locale = intlLocale(scope.locale), timeZone = options?.timeZone ?? scope.timeZone;
  const unavailable = scope.strings.feedback.unavailable ?? fallback(scope.locale);
  return useMemo(() => ({
    number(value: number, formatOptions?: Intl.NumberFormatOptions): string {
      if (!Number.isFinite(value)) return unavailable;
      try { return new Intl.NumberFormat(locale, formatOptions).format(value); } catch { return unavailable; }
    },
    date(value: ISODate): string {
      const parsed = parseISODate(value);
      if (!parsed) return unavailable;
      return new Intl.DateTimeFormat(locale, {timeZone:'UTC'}).format(parsed);
    },
    instant(value: ISOInstant, formatOptions?: Intl.DateTimeFormatOptions): string {
      const parsed = parseISOInstant(value);
      if (!parsed) return unavailable;
      try { return new Intl.DateTimeFormat(locale, {...formatOptions, timeZone:formatOptions?.timeZone ?? timeZone}).format(parsed); } catch { return unavailable; }
    },
  }), [locale, timeZone, unavailable]);
}

export function useRelativeTime(value: ISOInstant, options: {now: ISOInstant; unit?: RelativeUnit; live?: boolean; intervalMs?: number}): string {
  const {locale, strings, diagnostics} = useNovaScope();
  const [clock, setClock] = useState<ISOInstant | null>(null);
  const live = options.live ?? false, requestedInterval = options.intervalMs ?? 60000;
  const intervalValid = Number.isFinite(requestedInterval) && requestedInterval > 0;
  const interval = intervalValid ? requestedInterval : 60000;
  useEffect(() => {
    if (!live) return;
    if (!intervalValid) reportDiagnostic(diagnostics, 'NOVA_RELATIVE_INVALID_INTERVAL', 'useRelativeTime');
    const update = () => setClock(new Date().toISOString());
    update(); const timer = setInterval(update, interval);
    return () => clearInterval(timer);
  }, [live, interval, intervalValid, diagnostics]);
  const now = live ? clock ?? options.now : options.now;
  if (!parseISOInstant(value) || !parseISOInstant(now)) return strings.feedback.unavailable ?? fallback(locale);
  return formatRelative(value, {locale, now, ...(options.unit === undefined ? {} : {unit: options.unit})});
}
