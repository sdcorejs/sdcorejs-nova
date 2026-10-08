// Dev-only diagnostics (D-015): static code + component name, never user data;
// deduplicated per owner (a NovaProvider instance, or a component instance
// outside a provider). No module-level store (INV-001).
export type DiagnosticCode =
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
