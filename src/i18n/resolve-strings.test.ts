import { afterEach, describe, expect, it, vi as vitest } from 'vitest';

import { createDiagnosticOwner } from '../lib/diagnostics.js';
import { en } from './en.js';
import { formatMessage, resolveStrings } from './resolve-strings.js';
import type { NovaStrings } from './strings.js';
import { vi } from './vi.js';

afterEach(() => vitest.restoreAllMocks());

const silence = () => vitest.spyOn(console, 'warn').mockImplementation(() => {});

function leaves(strings: NovaStrings): [string, unknown][] {
  return Object.entries(strings).flatMap(([namespace, entries]) =>
    Object.entries(entries as Record<string, unknown>).map(([key, value]) => [`${namespace}.${key}`, value] as [string, unknown]));
}

describe('catalogs', () => {
  it('ship the P0 namespaces with identical key sets', () => {
    expect(Object.keys(vi).sort()).toEqual(['common', 'feedback', 'forms', 'navigation']);
    expect(leaves(vi).map(([key]) => key).sort()).toEqual(leaves(en).map(([key]) => key).sort());
    expect(leaves(vi).length).toBeGreaterThan(5);
  });
});

describe('resolveStrings (INV-012)', () => {
  it('vi catalog for vi and vi-VN, en for en-US, without diagnostics', () => {
    const warn = silence();
    expect(resolveStrings({ locale: 'vi', owner: createDiagnosticOwner() }).strings).toEqual(vi);
    expect(resolveStrings({ locale: 'vi-VN', owner: createDiagnosticOwner() }).strings).toEqual(vi);
    expect(resolveStrings({ locale: 'en-US', owner: createDiagnosticOwner() }).strings).toEqual(en);
    expect(warn).not.toHaveBeenCalled();
  });

  it('unknown locale falls back to en per key with one diagnostic per root', () => {
    const warn = silence();
    const owner = createDiagnosticOwner();
    const first = resolveStrings({ locale: 'fr', owner, overrides: { feedback: { retry: 'Réessayer' } } });
    expect(first.strings.feedback.retry).toBe('Réessayer');
    expect(first.strings.common).toEqual(en.common);
    expect(first.missing.length).toBe(leaves(en).length - 1);
    resolveStrings({ locale: 'fr', owner });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('NOVA_MISSING_TRANSLATION');
    resolveStrings({ locale: 'de', owner: createDiagnosticOwner() });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('a complete override set for an unknown locale needs no fallback', () => {
    const warn = silence();
    const result = resolveStrings({ locale: 'fr', owner: createDiagnosticOwner(), overrides: en });
    expect(result.missing).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('overrides merge per namespace and key', () => {
    const result = resolveStrings({ locale: 'vi', owner: createDiagnosticOwner(), overrides: { forms: { required: 'cần nhập' } } });
    expect(result.strings.forms.required).toBe('cần nhập');
    expect(result.strings.forms.configurationError).toBe(vi.forms.configurationError);
    expect(result.strings.feedback).toEqual(vi.feedback);
    expect(vi.forms.required).not.toBe('cần nhập');
  });

  it('never renders key names: invalid override values fall back to the catalog', () => {
    silence();
    const overrides = { feedback: { retry: 42, empty: '' }, unknown: { x: 'y' } } as unknown as Parameters<typeof resolveStrings>[0]['overrides'];
    const result = resolveStrings({ locale: 'fr', owner: createDiagnosticOwner(), overrides });
    expect(result.strings.feedback.retry).toBe(en.feedback.retry);
    expect(result.strings.feedback.empty).toBe(en.feedback.empty);
    expect(Object.keys(result.strings)).not.toContain('unknown');
    for (const [key, value] of leaves(result.strings)) {
      expect(value).not.toBe(key);
      expect(value).not.toBe(key.split('.')[1]);
    }
  });
});

describe('formatMessage plural {one, other} with {count}', () => {
  it('selects plural forms per locale and substitutes count', () => {
    const entry = { one: '{count} more person', other: '{count} more people' };
    expect(formatMessage(entry, 'en', { count: 1 })).toBe('1 more person');
    expect(formatMessage(entry, 'en', { count: 3 })).toBe('3 more people');
    expect(formatMessage(entry, 'en', { count: 0 })).toBe('0 more people');
    expect(formatMessage({ one: '{count} người', other: '{count} người khác' }, 'vi', { count: 1 })).toBe('1 người khác');
    expect(formatMessage('Thử lại', 'vi')).toBe('Thử lại');
    expect(formatMessage(vi.navigation.avatarOverflow, 'vi', { count: 3 })).toContain('3');
  });
});

// own-key catalog lookup, normalized locales.
describe('locale robustness', () => {
  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', '', '!!', 'x'.repeat(40)])(
    'locale %j never reaches a non-catalog value: en fallback with one diagnostic',
    (locale) => {
      const warn = silence();
      const result = resolveStrings({ locale, owner: createDiagnosticOwner() });
      expect(result.strings).toEqual(en);
      expect(result.missing.length).toBe(leaves(en).length);
      expect(warn).toHaveBeenCalledTimes(1);
    },
  );

  it('underscore tags resolve like hyphenated ones', () => {
    const warn = silence();
    expect(resolveStrings({ locale: 'vi_VN', owner: createDiagnosticOwner() }).strings).toEqual(vi);
    expect(resolveStrings({ locale: 'en_US', owner: createDiagnosticOwner() }).strings).toEqual(en);
    expect(warn).not.toHaveBeenCalled();
  });

  it('formatMessage normalizes underscore locales and falls back to en for malformed ones', () => {
    const entry = { one: '{count} more person', other: '{count} more people' };
    expect(formatMessage(entry, 'en_US', { count: 1 })).toBe('1 more person');
    expect(formatMessage(entry, '!!bad', { count: 2 })).toBe('2 more people');
    expect(formatMessage(entry, 'constructor', { count: 1 })).toBe('1 more person');
    expect(formatMessage('Thử lại', '')).toBe('Thử lại');
  });
});

// a well-formed but unsupported locale
// must not fall through to the host default locale (server and browser differ).
describe('unsupported locale formatting (round 2 R7)', () => {
  // Emulates an Intl host whose default locale is `host`: unsupported requests resolve to it.
  function withHostDefault<T>(host: string, run: () => T): T {
    const RealNumberFormat = Intl.NumberFormat;
    const RealPluralRules = Intl.PluralRules;
    const pick = (locales: unknown) =>
      (locales === undefined || RealNumberFormat.supportedLocalesOf(locales as string).length === 0 ? host : locales) as string;
    const NumberFormat = Object.assign(
      function NumberFormat(locales?: string, options?: Intl.NumberFormatOptions) { return new RealNumberFormat(pick(locales), options); },
      { supportedLocalesOf: RealNumberFormat.supportedLocalesOf.bind(RealNumberFormat) },
    );
    const PluralRules = Object.assign(
      function PluralRules(locales?: string, options?: Intl.PluralRulesOptions) { return new RealPluralRules(pick(locales), options); },
      { supportedLocalesOf: RealPluralRules.supportedLocalesOf.bind(RealPluralRules) },
    );
    Object.defineProperty(Intl, 'NumberFormat', { value: NumberFormat, configurable: true, writable: true });
    Object.defineProperty(Intl, 'PluralRules', { value: PluralRules, configurable: true, writable: true });
    try {
      return run();
    } finally {
      Object.defineProperty(Intl, 'NumberFormat', { value: RealNumberFormat, configurable: true, writable: true });
      Object.defineProperty(Intl, 'PluralRules', { value: RealPluralRules, configurable: true, writable: true });
    }
  }

  const entry = { one: '{count} more person', other: '{count} more people' };

  it.each(['zz', 'zz-Latn-ZZ'])('locale %s formats numbers with en on a de-DE host', (locale) => {
    expect(Intl.NumberFormat.supportedLocalesOf(locale)).toEqual([]);
    expect(withHostDefault('de-DE', () => formatMessage(entry, locale, { count: 1000 }))).toBe('1,000 more people');
  });

  it('locale zz selects en plural categories on a fr host', () => {
    expect(withHostDefault('fr', () => formatMessage(entry, 'zz', { count: 0 }))).toBe('0 more people');
    expect(withHostDefault('fr', () => formatMessage(entry, 'zz', { count: 1 }))).toBe('1 more person');
  });

  it('supported locales keep their own formatting', () => {
    expect(withHostDefault('en-US', () => formatMessage(entry, 'vi', { count: 1000 }))).toBe('1.000 more people');
    expect(withHostDefault('de-DE', () => formatMessage(entry, 'en_US', { count: 1000 }))).toBe('1,000 more people');
  });
});
