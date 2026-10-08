// @vitest-environment node
// Bundle isolation (PKG-AC02, INV-005, INV-011): a consumer that imports only
// `@sdcorejs/nova/button` must not pull other component modules, must carry a
// single React copy and must ship the button CSS. The real check runs on
// fixtures/bundle-isolation/dist built by `npm run smoke:pack`.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type Analysis = { modules: string[]; css: string };
type CheckBundle = {
  analyzeBundle: (distDir: string) => Analysis;
  checkBundle: (analysis: Analysis, options: { entry: string }) => string[];
};

const { analyzeBundle, checkBundle } = (await import(new URL('../../scripts/check-bundle.mjs', import.meta.url).href)) as CheckBundle;
const FIXTURE_DIST = fileURLToPath(new URL('../../fixtures/bundle-isolation/dist', import.meta.url));

const NOVA = '../node_modules/@sdcorejs/nova/dist';
const clean = (): Analysis => ({
  modules: [
    `${NOVA}/components/button/index.js`,
    `${NOVA}/components/button/button.js`,
    `${NOVA}/components/button/button-group.js`,
    `${NOVA}/providers/nova/context.js`,
    `${NOVA}/i18n/vi.js`,
    `${NOVA}/lib/cx.js`,
    '../node_modules/react/cjs/react.production.js',
    '../node_modules/react-dom/cjs/react-dom-client.production.js',
    '../src/main.jsx',
  ],
  css: '@layer nova.tokens, nova.base, nova.components; .nova-theme{--nova-color-action:#171717}.nova-button{color:var(--nova-color-on-action,#fff)}',
});

describe('checkBundle (synthetic)', () => {
  it('accepts a button-only bundle', () => {
    expect(checkBundle(clean(), { entry: 'button' })).toEqual([]);
  });

  it('fixture importing ./button contains no other component module', () => {
    const leaked = clean();
    leaked.modules.push(`${NOVA}/components/radio-group/radio-group.js`, `${NOVA}/components/alert/index.js`);
    const errors = checkBundle(leaked, { entry: 'button' }).join('\n');
    expect(errors).toMatch(/radio-group/);
    expect(errors).toMatch(/alert/);
  });

  it('single React copy', () => {
    const doubled = clean();
    doubled.modules.push('../node_modules/@sdcorejs/nova/node_modules/react/cjs/react.production.js');
    expect(checkBundle(doubled, { entry: 'button' }).join('\n')).toMatch(/react/);
    const twoDom = clean();
    twoDom.modules.push('../node_modules/other/node_modules/react-dom/cjs/react-dom-client.production.js');
    expect(checkBundle(twoDom, { entry: 'button' }).join('\n')).toMatch(/react-dom/);
    const none = clean();
    none.modules = none.modules.filter((module) => !module.includes('/react/'));
    expect(checkBundle(none, { entry: 'button' }).join('\n')).toMatch(/react/);
  });

  it('CSS present (button rules and tokens), and no other component CSS', () => {
    expect(checkBundle({ ...clean(), css: '' }, { entry: 'button' }).join('\n')).toMatch(/css/i);
    expect(checkBundle({ ...clean(), css: '.nova-button{}' }, { entry: 'button' }).join('\n')).toMatch(/token/i);
    expect(checkBundle({ ...clean(), css: `${clean().css}.nova-radio{}` }, { entry: 'button' }).join('\n')).toMatch(/radio/);
  });
});

describe('fixtures/bundle-isolation (real production build)', () => {
  it('the built fixture passes the isolation check', () => {
    expect(existsSync(FIXTURE_DIST), 'run `npm run smoke:pack` first').toBe(true);
    const analysis = analyzeBundle(FIXTURE_DIST);
    expect(analysis.modules.some((module) => module.includes('@sdcorejs/nova/dist/components/button/'))).toBe(true);
    expect(checkBundle(analysis, { entry: 'button' })).toEqual([]);
  });
});
