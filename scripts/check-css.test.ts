// @vitest-environment node
import { describe, expect, it } from 'vitest';

type Kind = 'tokens' | 'base' | 'component' | 'bundle';
type CheckCss = { checkCss: (css: string, options: { kind: Kind; filename?: string }) => string[] };
type BuildCss = {
  injectFallbacks: (css: string, filename?: string) => Promise<string>;
  loadTokens: () => Promise<{ generateTokensCss: () => string; lightFallbacks: () => Record<string, string> }>;
};

const { checkCss } = (await import(new URL('./check-css.mjs', import.meta.url).href)) as CheckCss;
const { injectFallbacks, loadTokens } = (await import(new URL('./build-css.mjs', import.meta.url).href)) as BuildCss;

const ORDER = '@layer nova.tokens, nova.base, nova.components;';
const component = (body: string) => `${ORDER}\n@layer nova.components {\n${body}\n}\n`;
const check = (css: string, kind: Kind = 'component') => checkCss(css, { kind, filename: 'fixture.css' });

describe('check-css positive controls', () => {
  it('accepts a scoped component stylesheet with exact light fallbacks', () => {
    const css = component(`
      .nova-button { color: var(--nova-color-text, #171717); padding: var(--nova-space-2, 8px); }
      .nova-button:where([data-disabled]) > svg { inline-size: 1em; }
      @media (forced-colors: active) { .nova-button:focus-visible { outline-color: CanvasText; } }
      @media (prefers-reduced-motion: reduce) { .nova-button { transition: none; } }`);
    expect(check(css)).toEqual([]);
  });

  it('accepts the generated tokens.css', async () => {
    const tokens = await loadTokens();
    expect(check(tokens.generateTokensCss(), 'tokens')).toEqual([]);
  });
});

describe('check-css negative fixtures', () => {
  it.each([
    [':root', ':root { color: red; }'],
    ['html', 'html .nova-button { color: red; }'],
    ['body', 'body.nova-x { color: red; }'],
    ['nested :root', '.nova-x:where(:root) { color: red; }'],
  ])('rejects %s', (_label, rule) => {
    expect(check(component(rule)).join('\n')).toMatch(/:root|html|body/);
  });

  it('rejects bare element selector', () => {
    expect(check(component('button { color: red; }')).join('\n')).toMatch(/selector/);
    expect(check(component('.app-button { color: red; }')).join('\n')).toMatch(/selector/);
    expect(check(component('.nova-button, input { color: red; }')).join('\n')).toMatch(/selector/);
  });

  it('rejects rule outside nova layers', () => {
    expect(check(`${ORDER}\n.nova-button { color: red; }`).join('\n')).toMatch(/layer/);
    expect(check(`${ORDER}\n@layer app { .nova-button { color: red; } }`).join('\n')).toMatch(/layer/);
    expect(check(`${ORDER}\n@layer nova.base { .nova-button { color: red; } }`, 'component').join('\n')).toMatch(/layer/);
    expect(check('@layer nova.components { .nova-button { color: red; } }').join('\n')).toMatch(/layer order/);
  });

  it('rejects var(--nova-*) without matching light fallback', () => {
    expect(check(component('.nova-a { color: var(--nova-color-text); }')).join('\n')).toMatch(/fallback/);
    expect(check(component('.nova-a { color: var(--nova-color-text, #000000); }')).join('\n')).toMatch(/fallback/);
    expect(check(component('.nova-a { padding: calc(var(--nova-space-2) * 2); }')).join('\n')).toMatch(/fallback/);
    expect(check(component('.nova-a { color: var(--nova-color-unknown, #000000); }')).join('\n')).toMatch(/unknown/);
  });

  it('rejects custom property outside --nova-*', () => {
    expect(check(component('.nova-a { color: var(--brand, red); }')).join('\n')).toMatch(/--brand/);
    expect(check(`${ORDER}\n@layer nova.tokens { :where(.nova-theme) { --brand: red; } }`, 'tokens').join('\n')).toMatch(/--brand/);
  });

  it('rejects declaring --nova-* outside .nova-theme', () => {
    expect(check(component('.nova-button { --nova-color-text: red; }')).join('\n')).toMatch(/nova-theme/);
    expect(check(`${ORDER}\n@layer nova.tokens { :where(.nova-scope) { --nova-color-text: red; } }`, 'tokens').join('\n')).toMatch(/nova-theme/);
  });
});

describe('build-css fallback injection', () => {
  it('injects the light value as var() fallback, including inside calc()', async () => {
    const tokens = await loadTokens();
    const fallbacks = tokens.lightFallbacks();
    const output = await injectFallbacks(component('.nova-a { color: var(--nova-color-text); margin: calc(var(--nova-space-2) * -1); }'));
    expect(output).toContain(`var(--nova-color-text, ${fallbacks['--nova-color-text']})`);
    expect(output).toContain(`var(--nova-space-2, ${fallbacks['--nova-space-2']})`);
    expect(check(output)).toEqual([]);
  });

  it('fails the build on an unknown --nova-* name instead of guessing', async () => {
    await expect(injectFallbacks(component('.nova-a { color: var(--nova-color-nope); }'))).rejects.toThrow(/nova-color-nope/);
  });
});

describe('check-css untyped declaration fallbacks', () => {
  it('treats var() in properties lightningcss keeps as untyped (e.g. outline-offset) as normal declarations', () => {
    const css = component('.nova-a:focus-visible { outline-offset: var(--nova-focus-offset, 2px); outline: var(--nova-focus-width, 2px) solid var(--nova-color-focus-ring, #171717); }');
    expect(check(css)).toEqual([]);
    expect(check(component('.nova-a { outline-offset: var(--nova-focus-offset); }')).join('\n')).toMatch(/fallback/);
  });
});

describe('check-css duration unit fallbacks', () => {
  it('accepts a time fallback that lightningcss printed in seconds (.15s for 150ms) and still rejects a different time', () => {
    expect(check(component('.nova-a { transition: color var(--nova-duration, .15s) ease; }'))).toEqual([]);
    expect(check(component('.nova-a { transition: color var(--nova-duration, .2s) ease; }')).join('\n')).toMatch(/fallback/);
  });
});

// scope must be guaranteed, not merely mentioned.
describe('check-css guaranteed scope', () => {
  it.each([
    ['negated class', ':not(.nova-x) { color: red; }'],
    ['branch without Nova scope', ':is(.nova-x, button) { color: red; }'],
    ['where branch without Nova scope', ':where(.nova-x, .app) span { color: red; }'],
    ['class only inside :has()', '.app:has(.nova-x) { color: red; }'],
    ['class only inside a negation of an ancestor', ':not(.nova-x) > span { color: red; }'],
  ])('rejects %s', (_label, rule) => {
    expect(check(component(rule)).join('\n')).toMatch(/selector/);
  });

  it.each([
    ['descendant of the theme', `${ORDER}\n@layer nova.tokens { .nova-theme .app-child { --nova-color-text: red; } }`],
    ['theme only inside :has()', `${ORDER}\n@layer nova.tokens { .app:has(.nova-theme) { --nova-color-text: red; } }`],
    ['negated theme', `${ORDER}\n@layer nova.tokens { .nova-x:not(.nova-theme) { --nova-color-text: red; } }`],
  ])('rejects --nova-* declared on a non-theme subject: %s', (_label, css) => {
    expect(check(css, 'tokens').join('\n')).toMatch(/nova-theme/);
  });

  it('keeps guaranteed scopes accepted', () => {
    const css = component(`
      .nova-a:is(.nova-b, .nova-c) { color: var(--nova-color-text, #171717); }
      :where(.nova-a, .nova-b) > svg { inline-size: 1em; }
      .nova-a:not([data-x]) .nova-b { inline-size: 1em; }
      .nova-a:has(> svg) { inline-size: 1em; }`);
    expect(check(css)).toEqual([]);
    expect(check(`${ORDER}\n@layer nova.tokens { :where(.nova-theme[data-nova-theme="dark"]) { --nova-color-text: #f4f4f5; } }`, 'tokens')).toEqual([]);
  });
});

// sibling combinators, branch subjects, pseudo-elements.
describe('check-css guaranteed scope (round 2 R4)', () => {
  it.each([
    ['next sibling of a Nova element', '.nova-x + .app { color: red; }'],
    ['later sibling of a Nova element', '.nova-x ~ button { color: red; }'],
    ['sibling chain leaving the Nova element', '.nova-x + .a > .b { color: red; }'],
    ['sibling inside :is()', ':is(.nova-x + .app) { color: red; }'],
    ['sibling ancestor inside :where()', ':where(.nova-x ~ .app) span { color: red; }'],
    ['sibling of a branch that may be the Nova element itself', ':is(.nova-a .x, .nova-b) + .y { color: red; }'],
  ])('rejects %s', (_label, rule) => {
    expect(check(component(rule)).join('\n')).toMatch(/selector/);
  });

  it.each([
    ['descendant inside :is()', ':is(.nova-theme .app-child) { --nova-color-text: red; }'],
    ['descendants in every :where() branch', ':where(.nova-theme .a, .nova-theme .b) { --nova-color-text: red; }'],
    ['pseudo-element of the theme', '.nova-theme::before { --nova-color-text: red; }'],
    ['pseudo-element inside a :where() branch subject', ':where(.nova-theme) ::after { --nova-color-text: red; }'],
    ['sibling of the theme', '.nova-theme + .nova-theme-like { --nova-color-text: red; }'],
  ])('rejects --nova-* declared on a non-theme subject: %s', (_label, rule) => {
    expect(check(`${ORDER}\n@layer nova.tokens { ${rule} }`, 'tokens').join('\n')).toMatch(/nova-theme/);
  });

  it('keeps legitimate scoped selectors accepted', () => {
    const css = component(`
      .nova-a .x + .y { inline-size: 1em; }
      .nova-a > .x ~ .y { inline-size: 1em; }
      .nova-a + .nova-b { inline-size: 1em; }
      .nova-a::before { content: ""; }
      .nova-a > .x::placeholder { color: var(--nova-color-text, #171717); }
      :is(.nova-a .x, .nova-b > .z) + .y { inline-size: 1em; }
      .x:is(.nova-a) { inline-size: 1em; }`);
    expect(check(css)).toEqual([]);
    expect(check(`${ORDER}\n@layer nova.tokens { :is(.nova-theme, .nova-theme[data-nova-theme="dark"]) { --nova-color-text: #f4f4f5; } }`, 'tokens')).toEqual([]);
    expect(check(`${ORDER}\n@layer nova.tokens { .nova-theme[data-nova-theme="dark"]:not([hidden]) { --nova-color-text: #f4f4f5; } }`, 'tokens')).toEqual([]);
  });
});
