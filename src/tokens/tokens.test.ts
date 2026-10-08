// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  COLOR_TOKEN_NAMES,
  CONTROL_BOUNDARY_TOKEN,
  colorTokens,
  contrastRatio,
  generateTokensCss,
  lightFallbacks,
  meetsContrast,
  scaleTokens,
  type ColorTokenName,
} from './tokens.js';

const THEMES = ['light', 'dark'] as const;
const TONES = ['error', 'success', 'warning', 'info', 'tip'] as const;

function ratio(theme: 'light' | 'dark', fg: ColorTokenName, bg: ColorTokenName): number {
  return contrastRatio(colorTokens[theme][fg], colorTokens[theme][bg]);
}

describe('contrast math', () => {
  it('computes WCAG ratios for known pairs', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#ffffff', '#777777')).toBeCloseTo(contrastRatio('#777777', '#ffffff'), 10);
  });

  it('boundary: 4.49:1 fails AA text and 4.5:1 passes', () => {
    expect(meetsContrast(4.49, 4.5)).toBe(false);
    expect(meetsContrast(4.5, 4.5)).toBe(true);
    expect(meetsContrast(2.99, 3)).toBe(false);
    expect(meetsContrast(Number.NaN, 3)).toBe(false);
  });

  it('rejects malformed colors instead of guessing', () => {
    expect(() => contrastRatio('red', '#ffffff')).toThrow();
    expect(() => contrastRatio('#fff', '#ffffff')).toThrow();
  });
});

describe('token palette contrast', () => {
  it('declares every color token in light and dark', () => {
    expect(COLOR_TOKEN_NAMES.length).toBeGreaterThan(0);
    for (const theme of THEMES) {
      expect(Object.keys(colorTokens[theme]).sort()).toEqual([...COLOR_TOKEN_NAMES].sort());
      for (const name of COLOR_TOKEN_NAMES) expect(colorTokens[theme][name], `${theme}.${name}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it.each(THEMES)('text pairs ≥ 4.5:1 (%s)', (theme) => {
    for (const fg of ['text', 'text-muted', 'disabled-text'] as const) {
      for (const bg of ['background', 'surface'] as const) {
        expect(meetsContrast(ratio(theme, fg, bg), 4.5), `${fg} on ${bg}`).toBe(true);
      }
    }
    expect(meetsContrast(ratio(theme, 'disabled-text', 'disabled-surface'), 4.5)).toBe(true);
    expect(meetsContrast(ratio(theme, 'on-action', 'action'), 4.5)).toBe(true);
    expect(meetsContrast(ratio(theme, 'on-danger', 'danger'), 4.5)).toBe(true);
  });

  it.each(THEMES)('control-border ≥ 3:1 vs background and surface (%s)', (theme) => {
    expect(meetsContrast(ratio(theme, 'control-border', 'background'), 3)).toBe(true);
    expect(meetsContrast(ratio(theme, 'control-border', 'surface'), 3)).toBe(true);
  });

  it.each(THEMES)('focus-ring ≥ 3:1 (%s)', (theme) => {
    expect(meetsContrast(ratio(theme, 'focus-ring', 'background'), 3)).toBe(true);
    expect(meetsContrast(ratio(theme, 'focus-ring', 'surface'), 3)).toBe(true);
  });

  it.each(THEMES)('every status tone text ≥ 4.5:1 on background and tone surface (%s)', (theme) => {
    for (const tone of TONES) {
      const text = `${tone}-text` as ColorTokenName;
      const surface = `${tone}-surface` as ColorTokenName;
      expect(meetsContrast(ratio(theme, text, 'background'), 4.5), `${text} on background`).toBe(true);
      expect(meetsContrast(ratio(theme, text, surface), 4.5), `${text} on ${surface}`).toBe(true);
      expect(meetsContrast(ratio(theme, 'text', surface), 4.5), `text on ${surface}`).toBe(true);
    }
  });

  it('decorative border is not used as control boundary token', () => {
    expect(CONTROL_BOUNDARY_TOKEN).toBe('control-border');
    expect(COLOR_TOKEN_NAMES).toContain('border');
    expect(colorTokens.light.border).not.toBe(colorTokens.light['control-border']);
    // the decorative border is intentionally too faint to serve as a boundary
    expect(meetsContrast(ratio('light', 'border', 'background'), 3)).toBe(false);
  });
});

function layerBlock(css: string, layer: string): { inside: string; outside: string } {
  const opener = `@layer ${layer} {`;
  const start = css.indexOf(opener);
  if (start < 0) return { inside: '', outside: css };
  let depth = 0;
  for (let index = start + opener.length - 1; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) {
      return { inside: css.slice(start + opener.length, index), outside: css.slice(0, start) + css.slice(index + 1) };
    }
  }
  return { inside: '', outside: css };
}

describe('tokens.css generator', () => {
  const css = generateTokensCss();

  it('starts with the public layer order', () => {
    expect(css.trimStart().startsWith('@layer nova.tokens, nova.base, nova.components;')).toBe(true);
  });

  it('generator declares vars only under :where(.nova-theme) inside nova.tokens', () => {
    const { inside, outside } = layerBlock(css, 'nova.tokens');
    expect(inside).not.toBe('');
    expect(outside.replace('@layer nova.tokens, nova.base, nova.components;', '').trim()).toBe('');
    expect(css).not.toMatch(/:root|(^|[\s,}])html[\s,{]|(^|[\s,}])body[\s,{]/);
    const selectors = [...inside.matchAll(/([^{};]+)\{/g)].map((match) => match[1]!.trim());
    expect(new Set(selectors)).toEqual(new Set([
      ':where(.nova-theme)',
      ':where(.nova-theme[data-nova-theme="dark"])',
      '@media (prefers-color-scheme: dark)',
      ':where(.nova-theme[data-nova-theme="system"])',
    ]));
    const declared = [...inside.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]!);
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) expect(name).toMatch(/^--nova-/);
    for (const name of COLOR_TOKEN_NAMES) {
      expect(inside).toContain(`--nova-color-${name}: ${colorTokens.light[name]};`);
      expect(inside).toContain(`--nova-color-${name}: ${colorTokens.dark[name]};`);
    }
  });

  it('fallback map equals light values', () => {
    const fallbacks = lightFallbacks();
    for (const name of COLOR_TOKEN_NAMES) expect(fallbacks[`--nova-color-${name}`]).toBe(colorTokens.light[name]);
    for (const [name, value] of Object.entries(scaleTokens)) expect(fallbacks[`--nova-${name}`]).toBe(value);
    expect(Object.keys(fallbacks).length).toBe(COLOR_TOKEN_NAMES.length + Object.keys(scaleTokens).length);
  });
});

// every surface a control can sit on (INV-013).
describe('control boundary on every supported surface', () => {
  const CONTROL_SURFACES = [
    'background', 'surface', 'surface-hover', 'disabled-surface',
    'error-surface', 'success-surface', 'warning-surface', 'info-surface', 'tip-surface',
  ] as const;

  it.each(THEMES)('control-border ≥ 3:1 on every control surface (%s)', (theme) => {
    for (const surface of CONTROL_SURFACES) {
      expect(meetsContrast(ratio(theme, 'control-border', surface), 3), `control-border on ${surface}`).toBe(true);
    }
  });

  it.each(THEMES)('focus-ring ≥ 3:1 on every control surface (%s)', (theme) => {
    for (const surface of CONTROL_SURFACES) {
      expect(meetsContrast(ratio(theme, 'focus-ring', surface), 3), `focus-ring on ${surface}`).toBe(true);
    }
  });

  it('keeps the decorative border separate from the control boundary in both themes', () => {
    for (const theme of THEMES) expect(colorTokens[theme].border).not.toBe(colorTokens[theme]['control-border']);
  });
});
