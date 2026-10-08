// Type fixture (evidence class T) for the i18n catalogs.
import { en, vi, type NovaStringOverrides, type NovaStrings } from '../../src/i18n/index.js';

export const viCatalog = vi satisfies NovaStrings;
export const enCatalog = en satisfies NovaStrings;

export const partial: NovaStringOverrides = { feedback: { retry: 'Réessayer' } };
export const full: NovaStringOverrides = en;

// @ts-expect-error a catalog must provide every namespace
export const missingNamespace: NovaStrings = { common: en.common, forms: en.forms, feedback: en.feedback };

// @ts-expect-error overrides only accept known namespaces
export const unknownNamespace: NovaStringOverrides = { dialogs: { close: 'x' } };

// @ts-expect-error overrides only accept known keys
export const unknownKey: NovaStringOverrides = { feedback: { retryNow: 'x' } };

// @ts-expect-error plural entries need both one and other
export const halfPlural: NovaStringOverrides = { navigation: { avatarOverflow: { one: '{count}' } } };

// @ts-expect-error plain entries are strings, not numbers
export const numericEntry: NovaStringOverrides = { feedback: { retry: 1 } };
