// Dev-only diagnostics (D-015): static code + component name, never user data;
// deduplicated per owner (a NovaProvider instance, or a component instance
// outside a provider). No module-level store (INV-001).
export type DiagnosticCode =
  | 'NOVA_DATE_INVALID_CONFIGURATION'
  | 'NOVA_MULTI_SELECT_INVALID_CONFIGURATION'
  | 'NOVA_SELECT_DUPLICATE_KEY'
  | 'NOVA_SELECT_NONFINITE_KEY'
  | 'NOVA_NUMBER_INVALID_CONFIGURATION'
  | 'NOVA_CONFIRM_SERVER_CALL'
  | 'NOVA_ANCHOR_DUPLICATE_ID'
  | 'NOVA_ANCHOR_MISSING_ID'
  | 'NOVA_TABS_UNKNOWN_VALUE'
  | 'NOVA_MENU_DEPTH'
  | 'NOVA_NESTED_PORTAL_CONTAINER'
  | 'NOVA_INLINE_TEXT_INVALID_MIN_CHARS'
  | 'NOVA_RELATIVE_INVALID_INTERVAL'
  | 'NOVA_CONTROLLED_MODE_CHANGE'
  | 'NOVA_MISSING_TRANSLATION'
  | 'NOVA_INVALID_TIMEZONE'
  | 'NOVA_ACCESSIBLE_NAME_EMPTY'
  | 'NOVA_NAME_FROM_FIELD_OUTSIDE'
  | 'NOVA_FIELD_EMPTY_LABEL'
  | 'NOVA_FIELD_DUPLICATE_CONTROL'
  | 'NOVA_LABELLEDBY_DANGLING'
  | 'NOVA_RADIO_UNKNOWN_VALUE'
  | 'NOVA_RADIO_DUPLICATE_KEY'
  | 'NOVA_RADIO_NONFINITE_KEY'
  | 'NOVA_AVATAR_INVALID_MAX'
  | 'NOVA_PROGRESS_INVALID_VALUE'
  | 'NOVA_PROGRESS_INVALID_MAX'
  | 'NOVA_ALERT_UNNAMED';

const MESSAGES: Readonly<Record<DiagnosticCode, string>> = {
  NOVA_DATE_INVALID_CONFIGURATION: 'civil values, reference date, bounds, initial month and week start must form a valid date configuration',
  NOVA_MULTI_SELECT_INVALID_CONFIGURATION: 'maxSelected and maxItems must be finite non-negative integers; invalid limits are ignored',
  NOVA_SELECT_DUPLICATE_KEY: 'options must have unique typed keys',
  NOVA_SELECT_NONFINITE_KEY: 'numeric option and selection keys must be finite',
  NOVA_NUMBER_INVALID_CONFIGURATION: 'number value and bounds must be finite, min must not exceed max, and step must be positive and finite',
  NOVA_CONFIRM_SERVER_CALL: 'server confirmation invocation is cancelled; request a decision from a client event',
  NOVA_ANCHOR_DUPLICATE_ID: 'anchor IDs must be unique; ambiguous navigation is omitted',
  NOVA_ANCHOR_MISSING_ID: 'anchor target is missing from the current scroll root; the native link remains available',
  NOVA_TABS_UNKNOWN_VALUE: 'selected tab is missing or disabled; showing the first enabled tab without emitting a change',
  NOVA_MENU_DEPTH: 'action menus support one submenu level; deeper groups are omitted',
  NOVA_NESTED_PORTAL_CONTAINER: 'nested overlays use the active parent portal subtree when the requested container is outside it; close the parent before opening an independent overlay in an external host',
  NOVA_INLINE_TEXT_INVALID_MIN_CHARS: 'minChars must be finite and at least 2; using visual size 2',
  NOVA_RELATIVE_INVALID_INTERVAL: 'relative update interval must be positive and finite; using 60000ms',
  NOVA_CONTROLLED_MODE_CHANGE: 'switched between controlled and uncontrolled; keeping the mount mode',
  NOVA_MISSING_TRANSLATION: 'missing translation keys fall back to en',
  NOVA_INVALID_TIMEZONE: 'invalid IANA timeZone; falling back to UTC',
  NOVA_ACCESSIBLE_NAME_EMPTY: 'accessible name is missing or empty; rendering a configuration error',
  NOVA_NAME_FROM_FIELD_OUTSIDE: 'nameFromField used outside a Field; rendering a configuration error',
  NOVA_FIELD_EMPTY_LABEL: 'Field label is empty; rendering a configuration error',
  NOVA_FIELD_DUPLICATE_CONTROL: 'a Field owns exactly one nameFromField control; extra control replaced by a configuration error',
  NOVA_LABELLEDBY_DANGLING: 'aria-labelledby references no element',
  NOVA_RADIO_UNKNOWN_VALUE: 'value matches no option; nothing is selected',
  NOVA_RADIO_DUPLICATE_KEY: 'two options serialize to the same form value; rendering a configuration error',
  NOVA_RADIO_NONFINITE_KEY: 'option value is a non-finite number; rendering a configuration error',
  NOVA_AVATAR_INVALID_MAX: 'max must be a finite number ≥ 1; showing all avatars',
  NOVA_PROGRESS_INVALID_VALUE: 'value is not finite; rendering indeterminate',
  NOVA_PROGRESS_INVALID_MAX: 'max must be a finite number > 0; using 100',
  NOVA_ALERT_UNNAMED: 'action-only alert needs aria-label, title or body text',
};

export type DiagnosticOwner = { readonly seen: Set<string> };

export function createDiagnosticOwner(): DiagnosticOwner {
  return { seen: new Set() };
}

// Module-local declaration: keeps `process.env.NODE_ENV` literal for bundler
// replacement without requiring @types/node in consumers' declaration builds.
declare const process: { env: { NODE_ENV?: string } };

function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === 'production';
  } catch {
    return false;
  }
}

export function reportDiagnostic(owner: DiagnosticOwner, code: DiagnosticCode, component: string): void {
  if (isProduction()) return;
  const key = `${code}|${component}`;
  if (owner.seen.has(key)) return;
  owner.seen.add(key);
  console.warn(`[nova] ${code} <${component}>: ${MESSAGES[code]}`);
}
