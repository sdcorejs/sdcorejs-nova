// Single token source (D-013): generates tokens.css and the light fallbacks that
// scripts/build-css.mjs injects into component CSS. Contrast tests run on it.
// Palette values are the §8.4 candidates; change values here, never thresholds.
// Theme Nova v2 (docs/nova/design-system-v2.vi.md): neutral zinc ramp, compact
// density (md 32), radius 6/8/10. Names stay `--nova-*`; v2 roles map onto them.

export const COLOR_TOKEN_NAMES = [
  'background', 'surface', 'surface-hover', 'surface-active', 'popover',
  'text', 'text-muted', 'border', 'border-strong', 'control-border', 'control-border-hover',
  'focus-ring', 'action', 'action-hover', 'action-active', 'on-action', 'danger', 'danger-hover', 'on-danger',
  'disabled-text', 'disabled-surface',
  'error-text', 'error-surface', 'error-border', 'success-text', 'success-surface', 'success-border',
  'warning-text', 'warning-surface', 'warning-border', 'info-text', 'info-surface', 'info-border',
  'tip-text', 'tip-surface', 'tip-border',
] as const;
export type ColorTokenName = (typeof COLOR_TOKEN_NAMES)[number];
export type ColorPalette = Readonly<Record<ColorTokenName, string>>;

/** Interactive control boundaries use this token; `border` is decorative only. */
export const CONTROL_BOUNDARY_TOKEN: ColorTokenName = 'control-border';

/**
 * Neutral ramp (cool zinc). Every neutral below points at one step; 550 exists
 * only for the dark control boundary, which must stay ≥ 3:1 on dark tone surfaces.
 */
export const grayRamp = {
  0: '#ffffff', 50: '#fafafb', 100: '#f4f4f5', 150: '#ececee', 200: '#e0e0e4', 300: '#c9c9cf',
  400: '#a1a1aa', 500: '#8a8a93', 550: '#71717a', 600: '#6a6a73', 700: '#52525a', 800: '#3f3f46',
  850: '#2a2a2f', 900: '#1e1e22', 950: '#17171a', 975: '#0f0f11',
} as const;

const gray = grayRamp;

export const colorTokens: Readonly<Record<'light' | 'dark', ColorPalette>> = {
  light: {
    background: gray[0],
    surface: gray[50],
    'surface-hover': gray[100],
    'surface-active': gray[150],
    popover: gray[0],
    text: gray[950],
    'text-muted': gray[700],
    border: gray[200],
    'border-strong': gray[300],
    'control-border': gray[500],
    'control-border-hover': gray[600],
    'focus-ring': gray[950],
    action: gray[950],
    'action-hover': gray[800],
    'action-active': gray[700],
    'on-action': gray[0],
    danger: '#b42318',
    'danger-hover': '#9a1c13',
    'on-danger': '#ffffff',
    'disabled-text': gray[600],
    'disabled-surface': gray[100],
    'error-text': '#b42318',
    'error-surface': '#fef3f2',
    'error-border': '#e9b9b5',
    'success-text': '#067647',
    'success-surface': '#ecfdf3',
    'success-border': '#acd7c3',
    'warning-text': '#b54708',
    'warning-surface': '#fffaeb',
    'warning-border': '#eac8ab',
    'info-text': '#175cd3',
    'info-surface': '#eff8ff',
    'info-border': '#b3ccf3',
    'tip-text': '#6941c6',
    'tip-surface': '#f4f3ff',
    'tip-border': '#cdc1ef',
  },
  dark: {
    background: gray[975],
    surface: gray[950],
    'surface-hover': gray[900],
    'surface-active': gray[850],
    popover: gray[950],
    text: gray[100],
    'text-muted': gray[400],
    border: gray[850],
    'border-strong': gray[800],
    'control-border': gray[550],
    'control-border-hover': gray[500],
    'focus-ring': gray[100],
    action: gray[100],
    'action-hover': gray[200],
    'action-active': gray[300],
    'on-action': gray[950],
    danger: '#f97066',
    'danger-hover': '#fb8a81',
    'on-danger': gray[950],
    'disabled-text': gray[500],
    'disabled-surface': gray[900],
    // Tone surfaces are a 12% tint on the dark background, not saturated fills.
    'error-text': '#fda29b',
    'error-surface': '#2c2122',
    'error-border': '#5b3e3d',
    'success-text': '#75e0a7',
    'success-surface': '#1b2823',
    'success-border': '#305241',
    'warning-text': '#fec84b',
    'warning-surface': '#2c2518',
    'warning-border': '#5b4a24',
    'info-text': '#84caff',
    'info-surface': '#1d252e',
    'info-border': '#344b5d',
    'tip-text': '#bdb4fe',
    'tip-surface': '#24232d',
    'tip-border': '#47445d',
  },
};

/** Theme-dependent effects (`--nova-<name>`): dark uses heavier shadows and a darker backdrop. */
export const EFFECT_TOKEN_NAMES = [
  'shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-overlay', 'color-backdrop',
] as const;
export type EffectTokenName = (typeof EFFECT_TOKEN_NAMES)[number];

export const effectTokens: Readonly<Record<'light' | 'dark', Readonly<Record<EffectTokenName, string>>>> = {
  light: {
    'shadow-xs': '0 1px 2px rgb(0 0 0 / 0.05)',
    'shadow-sm': '0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
    'shadow-md': '0 6px 16px -4px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
    'shadow-lg': '0 20px 40px -12px rgb(0 0 0 / 0.22), 0 4px 8px -4px rgb(0 0 0 / 0.06)',
    /** v1 name kept for consumers; equals shadow-md. */
    'shadow-overlay': '0 6px 16px -4px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
    'color-backdrop': 'rgb(0 0 0 / 0.4)',
  },
  dark: {
    'shadow-xs': '0 1px 2px rgb(0 0 0 / 0.4)',
    'shadow-sm': '0 1px 3px rgb(0 0 0 / 0.5)',
    'shadow-md': '0 8px 20px -4px rgb(0 0 0 / 0.6)',
    'shadow-lg': '0 24px 48px -12px rgb(0 0 0 / 0.7)',
    'shadow-overlay': '0 8px 20px -4px rgb(0 0 0 / 0.6)',
    'color-backdrop': 'rgb(0 0 0 / 0.6)',
  },
};

/** Theme-independent scale tokens (`--nova-<name>`). */
export const scaleTokens: Readonly<Record<string, string>> = {
  'font-family': 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'font-size-xs': '12px',
  'line-height-xs': '16px',
  'font-size-label': '13px',
  'line-height-label': '18px',
  'font-size-body': '14px',
  'line-height-body': '20px',
  'font-size-input-mobile': '16px',
  'line-height-input-mobile': '24px',
  'font-size-md': '16px',
  'line-height-md': '24px',
  'font-size-lg': '18px',
  'line-height-lg': '26px',
  'font-size-title': '20px',
  'line-height-title': '28px',
  'font-size-2xl': '24px',
  'line-height-2xl': '32px',
  'font-weight-regular': '400',
  'font-weight-medium': '500',
  'font-weight-strong': '600',
  'space-0-5': '2px',
  'space-1': '4px',
  'space-1-5': '6px',
  'space-2': '8px',
  'space-2-5': '10px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '24px',
  'space-6': '32px',
  'space-7': '48px',
  'radius-xs': '4px',
  'radius-control': '6px',
  'radius-popup': '8px',
  'radius-card': '8px',
  'radius-overlay': '10px',
  'radius-full': '999px',
  'border-width': '1px',
  'focus-width': '2px',
  'focus-offset': '2px',
  'control-xs': '24px',
  'control-sm': '28px',
  'control-md': '32px',
  'control-lg': '40px',
  'hit-target': '44px',
  'icon-xs': '14px',
  'icon-sm': '16px',
  'icon-lg': '20px',
  'row-sm': '32px',
  'row-md': '40px',
  'row-header': '36px',
  'col-select': '36px',
  'col-actions': '40px',
  'bar-height': '52px',
  'popup-min-width': '180px',
  'dialog-sm': '400px',
  'dialog-md': '560px',
  'dialog-lg': '800px',
  duration: '150ms',
  'duration-fast': '100ms',
  'duration-slow': '200ms',
  'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
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

function declarations(theme: 'light' | 'dark', withScale: boolean, indent: string): string {
  const palette = colorTokens[theme];
  const lines = COLOR_TOKEN_NAMES.map((name) => `${indent}--nova-color-${name}: ${palette[name]};`);
  for (const name of EFFECT_TOKEN_NAMES) lines.push(`${indent}--nova-${name}: ${effectTokens[theme][name]};`);
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
    declarations('light', true, '    '),
    '  }',
    '  :where(.nova-theme[data-nova-theme="dark"]) {',
    declarations('dark', false, '    '),
    '  }',
    '  @media (prefers-color-scheme: dark) {',
    '    :where(.nova-theme[data-nova-theme="system"]) {',
    declarations('dark', false, '      '),
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
  for (const name of EFFECT_TOKEN_NAMES) map[`--nova-${name}`] = effectTokens.light[name];
  for (const [name, value] of Object.entries(scaleTokens)) map[`--nova-${name}`] = value;
  return map;
}
