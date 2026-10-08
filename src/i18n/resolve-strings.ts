// Catalog resolution (INV-012): bundled vi/en by language subtag; any other
// locale uses consumer overrides and falls back to en per missing key with one
// diagnostic per root (owner). Never returns internal key names.
import { reportDiagnostic, type DiagnosticOwner } from '../lib/diagnostics.js';
import { en } from './en.js';
import type { NovaStringOverrides, NovaStrings, PluralEntry } from './strings.js';
import { vi } from './vi.js';

type Entry = string | PluralEntry;
type Namespace = keyof NovaStrings;

// Map lookup: inherited Object keys ("constructor", "__proto__", …) are never catalogs.
const BUNDLED: ReadonlyMap<string, NovaStrings> = new Map([['vi', vi], ['en', en]]);
const NAMESPACES = Object.keys(en) as Namespace[];

function isValidEntry(reference: Entry, candidate: unknown): candidate is Entry {
  if (typeof reference === 'string') return typeof candidate === 'string' && candidate.trim() !== '';
  return typeof candidate === 'object' && candidate !== null
    && typeof (candidate as PluralEntry).one === 'string' && (candidate as PluralEntry).one.trim() !== ''
    && typeof (candidate as PluralEntry).other === 'string' && (candidate as PluralEntry).other.trim() !== '';
}

/** BCP 47 canonical form (`en_US` → `en-US`), or null when the tag is malformed. */
export function normalizeLocale(locale: string): string | null {
  try {
    return Intl.getCanonicalLocales(String(locale).replaceAll('_', '-'))[0] ?? null;
  } catch {
    return null;
  }
}

/** Primary language subtag of a well-formed locale, or '' when malformed. */
export function languageOf(locale: string): string {
  return normalizeLocale(locale)?.split('-')[0]?.toLowerCase() ?? '';
}

export type ResolvedStrings = { strings: NovaStrings; missing: string[] };

export function resolveStrings(options: {
  locale: string;
  owner: DiagnosticOwner;
  overrides?: NovaStringOverrides | undefined;
}): ResolvedStrings {
  const base = BUNDLED.get(languageOf(options.locale));
  const overrides = (options.overrides ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const missing: string[] = [];
  const strings = {} as Record<Namespace, Record<string, Entry>>;
  for (const namespace of NAMESPACES) {
    const reference = en[namespace] as Record<string, Entry>;
    const target: Record<string, Entry> = {};
    for (const key of Object.keys(reference)) {
      const override = overrides[namespace]?.[key];
      const fromBase = base ? (base[namespace] as Record<string, Entry>)[key] : undefined;
      if (isValidEntry(reference[key]!, override)) target[key] = override;
      else if (fromBase !== undefined) target[key] = fromBase;
      else {
        target[key] = reference[key]!;
        missing.push(`${namespace}.${key}`);
      }
    }
    strings[namespace] = target;
  }
  if (missing.length) reportDiagnostic(options.owner, 'NOVA_MISSING_TRANSLATION', 'NovaProvider');
  return { strings: strings as unknown as NovaStrings, missing };
}

/**
 * Locale handed to Intl: the normalized tag when Intl supports it, otherwise en.
 * Intl would silently use the host default for an unsupported tag, and that
 * default differs between server and browser.
 */
function intlLocale(locale: string): string {
  const tag = normalizeLocale(locale);
  if (!tag) return 'en';
  const supported = Intl.NumberFormat.supportedLocalesOf(tag).length > 0 && Intl.PluralRules.supportedLocalesOf(tag).length > 0;
  return supported ? tag : 'en';
}

/** Formats an entry; plural entries select `one`/`other` by Intl.PluralRules. */
export function formatMessage(entry: Entry, locale: string, values?: { count: number }): string {
  const count = values?.count ?? 0;
  const tag = intlLocale(locale);
  const template = typeof entry === 'string'
    ? entry
    : new Intl.PluralRules(tag).select(count) === 'one' ? entry.one : entry.other;
  return template.replaceAll('{count}', new Intl.NumberFormat(tag).format(count));
}
