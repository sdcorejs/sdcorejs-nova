import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDiagnosticOwner, reportDiagnostic } from './diagnostics.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('diagnostics (D-015)', () => {
  it('emits once per owner, code and component', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const owner = createDiagnosticOwner();
    reportDiagnostic(owner, 'NOVA_MISSING_TRANSLATION', 'NovaProvider');
    reportDiagnostic(owner, 'NOVA_MISSING_TRANSLATION', 'NovaProvider');
    expect(warn).toHaveBeenCalledTimes(1);
    reportDiagnostic(owner, 'NOVA_INVALID_TIMEZONE', 'NovaProvider');
    reportDiagnostic(owner, 'NOVA_MISSING_TRANSLATION', 'Alert');
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('deduplicates per owner ref, not per module (two roots both report)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportDiagnostic(createDiagnosticOwner(), 'NOVA_INVALID_TIMEZONE', 'NovaProvider');
    reportDiagnostic(createDiagnosticOwner(), 'NOVA_INVALID_TIMEZONE', 'NovaProvider');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('message is static: code and component name only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportDiagnostic(createDiagnosticOwner(), 'NOVA_RADIO_UNKNOWN_VALUE', 'RadioGroup');
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain('NOVA_RADIO_UNKNOWN_VALUE');
    expect(message).toContain('RadioGroup');
    expect(warn.mock.calls[0]).toHaveLength(1);
  });

  it('is silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportDiagnostic(createDiagnosticOwner(), 'NOVA_INVALID_TIMEZONE', 'NovaProvider');
    expect(warn).not.toHaveBeenCalled();
  });
});
