// Single token source (D-013): generates tokens.css and the light fallbacks that
// scripts/build-css.mjs injects into component CSS. Contrast tests run on it.
// Palette values are the §8.4 candidates; change values here, never thresholds.

export const COLOR_TOKEN_NAMES = [
  'background', 'surface', 'surface-hover', 'text', 'text-muted', 'border', 'control-border',
  'focus-ring', 'action', 'action-hover', 'on-action', 'danger', 'on-danger',
  'disabled-text', 'disabled-surface',
  'error-text', 'error-surface', 'success-text', 'success-surface', 'warning-text', 'warning-surface',
  'info-text', 'info-surface', 'tip-text', 'tip-surface',
] as const;
export type ColorTokenName = (typeof COLOR_TOKEN_NAMES)[number];
export type ColorPalette = Readonly<Record<ColorTokenName, string>>;

/** Interactive control boundaries use this token; `border` is decorative only. */
export const CONTROL_BOUNDARY_TOKEN: ColorTokenName = 'control-border';

export const colorTokens: Readonly<Record<'light' | 'dark', ColorPalette>> = {
  light: {
    background: '#ffffff',
    surface: '#f7f7f8',
    'surface-hover': '#ececef',
    text: '#171717',
    'text-muted': '#5c5c63',
    border: '#d8d8de',
    'control-border': '#7c7c85',
    'focus-ring': '#171717',
    action: '#171717',
    'action-hover': '#3f3f46',
    'on-action': '#ffffff',
    danger: '#b42318',
    'on-danger': '#ffffff',
    'disabled-text': '#5c5c63',
    'disabled-surface': '#f2f2f4',
    'error-text': '#b42318',
    'error-surface': '#fef3f2',
    'success-text': '#067647',
    'success-surface': '#ecfdf3',
    'warning-text': '#b54708',
    'warning-surface': '#fffaeb',
    'info-text': '#175cd3',
    'info-surface': '#eff8ff',
    'tip-text': '#6941c6',
    'tip-surface': '#f4f3ff',
  },
  dark: {
    background: '#111113',
    surface: '#1c1c20',
    'surface-hover': '#27272c',
    text: '#f4f4f5',
    'text-muted': '#a1a1aa',
    border: '#52525b',
    'control-border': '#7c7c86',
    'focus-ring': '#f4f4f5',
    action: '#f4f4f5',
    'action-hover': '#d4d4d8',
    'on-action': '#171717',
    danger: '#fda29b',
    'on-danger': '#171717',
    'disabled-text': '#a1a1aa',
    'disabled-surface': '#232328',
    'error-text': '#fda29b',
    'error-surface': '#55160c',
    'success-text': '#75e0a7',
    'success-surface': '#053321',
    'warning-text': '#fec84b',
    'warning-surface': '#4e1d09',
    'info-text': '#84caff',
    'info-surface': '#102a56',
    'tip-text': '#bdb4fe',
    'tip-surface': '#27115f',
  },
};

/** Theme-independent scale tokens (`--nova-<name>`). */
export const scaleTokens: Readonly<Record<string, string>> = {
  'font-family': 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'font-size-body': '14px',
  'line-height-body': '20px',
  'font-size-input-mobile': '16px',
  'line-height-input-mobile': '24px',
  'font-size-label': '13px',
  'line-height-label': '18px',
  'font-size-title': '20px',
  'line-height-title': '28px',
  'font-weight-strong': '600',
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',
  'space-6': '32px',
  'space-7': '48px',
  'radius-control': '6px',
  'radius-card': '10px',
  'radius-overlay': '12px',
  'border-width': '1px',
  'focus-width': '2px',
  'focus-offset': '2px',
  'control-sm': '28px',
  'control-md': '36px',
  'control-lg': '44px',
  'hit-target': '44px',
  duration: '150ms',
};

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function relativeLuminance(color: string): number {
  const match = HEX.exec(color);
  if (!match) throw new TypeError(`expected a #rrggbb color, received ${String(color)}`);
  const [r, g, b] = match.slice(1, 4).map((hex) => {
    const channel = Number.parseInt(hex, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #rrggbb colors (order-independent). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** True only when `ratio` reaches `minimum`; no rounding up (4.49 fails 4.5). */
export function meetsContrast(ratio: number, minimum: number): boolean {
  return Number.isFinite(ratio) && ratio >= minimum;
}

const LAYER_ORDER = '@layer nova.tokens, nova.base, nova.components;';

function declarations(palette: ColorPalette, withScale: boolean, indent: string): string {
  const lines = COLOR_TOKEN_NAMES.map((name) => `${indent}--nova-color-${name}: ${palette[name]};`);
  if (withScale) {
    for (const [name, value] of Object.entries(scaleTokens)) lines.push(`${indent}--nova-${name}: ${value};`);
  }
  return lines.join('\n');
}

/** Contents of tokens.css: variables only on `.nova-theme` scopes, inside `nova.tokens`. */
export function generateTokensCss(): string {
  return [
    LAYER_ORDER,
    '@layer nova.tokens {',
    '  :where(.nova-theme) {',
    declarations(colorTokens.light, true, '    '),
    '  }',
    '  :where(.nova-theme[data-nova-theme="dark"]) {',
    declarations(colorTokens.dark, false, '    '),
    '  }',
    '  @media (prefers-color-scheme: dark) {',
    '    :where(.nova-theme[data-nova-theme="system"]) {',
    declarations(colorTokens.dark, false, '      '),
    '    }',
    '  }',
    '}',
    '',
  ].join('\n');
}

/** `--nova-*` → light value, used as `var(--nova-x, <light>)` fallback outside a provider. */
export function lightFallbacks(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const name of COLOR_TOKEN_NAMES) map[`--nova-color-${name}`] = colorTokens.light[name];
  for (const [name, value] of Object.entries(scaleTokens)) map[`--nova-${name}`] = value;
  return map;
}
