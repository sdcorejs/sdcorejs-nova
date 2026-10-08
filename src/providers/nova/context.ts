'use client';
// Read-only Nova scope context (no setters, no module state — INV-001).
import { createContext, useContext, useState } from 'react';

import type { NovaStrings } from '../../i18n/strings.js';
import { vi } from '../../i18n/vi.js';
import { createDiagnosticOwner, reportDiagnostic, type DiagnosticCode, type DiagnosticOwner } from '../../lib/diagnostics.js';

export type NovaTheme = 'light' | 'dark' | 'system';

export type NovaScope = {
  theme: NovaTheme;
  resolvedTheme: 'light' | 'dark';
  locale: string;
  /** `undefined` outside a provider: the document direction is inherited. */
  dir: 'ltr' | 'rtl' | undefined;
  timeZone: string;
  strings: NovaStrings;
  /** Consumer token classes accumulated from every enclosing provider (§8.3). */
  tokenClasses: readonly string[];
  portalContainer: HTMLElement | null | undefined;
  diagnostics: DiagnosticOwner;
  inProvider: boolean;
};

export const NovaContext = createContext<NovaScope | null>(null);

/** Current scope; outside a provider: light, vi, inherited dir, per-instance diagnostics. */
export function useNovaScope(): NovaScope {
  const scope = useContext(NovaContext);
  const [ownDiagnostics] = useState(createDiagnosticOwner);
  if (scope) return scope;
  return {
    theme: 'light',
    resolvedTheme: 'light',
    locale: 'vi',
    dir: undefined,
    timeZone: 'UTC',
    strings: vi,
    tokenClasses: [],
    portalContainer: undefined,
    diagnostics: ownDiagnostics,
    inProvider: false,
  };
}

/** Reporter bound to the provider owner (or this component instance outside one). */
export function useDiagnostics(component: string): (code: DiagnosticCode) => void {
  const { diagnostics } = useNovaScope();
  return (code) => reportDiagnostic(diagnostics, code, component);
}

export function splitClasses(className: string | undefined): string[] {
  return (className ?? '').split(/\s+/u).filter(Boolean);
}
