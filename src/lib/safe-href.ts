// href allowlist (INV-010, architecture §10). Normalizes like the URL parser
// (strip leading/trailing C0 controls and spaces, drop tab/LF/CR anywhere), then
// allows only http, https, mailto, tel or scheme-less (relative) references.
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const EDGE_CONTROLS = /^[\u0000-\x20]+|[\u0000-\x20]+$/gu;
const TAB_NEWLINE = /[\t\n\r]/gu;
const ANY_CONTROL = /[\u0000-\u001f\u007f]/u;
const SCHEME = /^([a-z][a-z\d+.-]*):/iu;

/** Returns the normalized href when safe, otherwise `null` (render non-navigating text). */
export function sanitizeHref(href: string): string | null {
  if (typeof href !== 'string') return null;
  const normalized = href.replace(EDGE_CONTROLS, '').replace(TAB_NEWLINE, '');
  if (normalized === '' || ANY_CONTROL.test(normalized)) return null;
  const scheme = SCHEME.exec(normalized);
  if (!scheme) return normalized;
  return ALLOWED_SCHEMES.has(scheme[1]!.toLowerCase()) ? normalized : null;
}
