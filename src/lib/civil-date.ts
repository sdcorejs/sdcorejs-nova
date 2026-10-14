import { en } from '../i18n/en.js';
import { languageOf, normalizeLocale } from '../i18n/resolve-strings.js';
import { vi } from '../i18n/vi.js';
import type { ISOInstant } from '../types/temporal.js';

/** Gregorian date-only validation never reads the host clock or local timezone. */
export function parseISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.slice(0, 4) === '0000') return null;
  const parsed = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

/** An instant must explicitly state Z or its numeric offset, never machine-local time. */
export function parseISOInstant(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/u.exec(value);
  if (!match || !parseISODate(match[1]!) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export type RelativeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week';
const duration: Record<RelativeUnit, number> = { second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000 };

function intlLocale(locale: string): string {
  const tag = normalizeLocale(locale);
  return tag && Intl.NumberFormat.supportedLocalesOf(tag).length ? tag : 'en';
}
function fallback(locale: string): string { return languageOf(locale) === 'vi' ? vi.feedback.unavailable : en.feedback.unavailable; }

export function formatRelative(value: ISOInstant, options: {locale: string; now: ISOInstant; unit?: RelativeUnit}): string {
  const parsed = parseISOInstant(value), now = parseISOInstant(options.now);
  if (!parsed || !now) return fallback(options.locale);
  const elapsed = parsed.getTime() - now.getTime(), absolute = Math.abs(elapsed);
  const unit = options.unit ?? (absolute < duration.minute ? 'second' : absolute < duration.hour ? 'minute' : absolute < duration.day ? 'hour' : absolute < duration.week ? 'day' : 'week');
  try { return new Intl.RelativeTimeFormat(intlLocale(options.locale), {numeric:'auto'}).format(Math.round(elapsed / duration[unit]), unit); }
  catch { return fallback(options.locale); }
}
