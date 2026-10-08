import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Import-boundary rules encode INV-011 / architecture §5:
// pure modules never import components or providers, providers never import
// components, server-compatible components never import providers or hooks,
// and component → component edges are limited to the approved list.
const COMPONENTS = [
  'alert', 'avatar', 'badge', 'breadcrumb', 'button', 'card', 'checkbox',
  'data-state', 'field', 'input', 'link', 'radio-group', 'switch',
];
const ALLOWED_EDGES = {
  input: ['field'],
  checkbox: ['field'],
  switch: ['field'],
  'radio-group': ['field'],
  breadcrumb: ['link'],
  alert: ['button'],
  'data-state': ['button'],
};
const SERVER_COMPATIBLE = [
  'src/components/badge/badge.tsx',
  'src/components/card/card.tsx',
  'src/components/card/section.tsx',
  'src/components/link/link.tsx',
  'src/components/data-state/empty.tsx',
  'src/components/data-state/skeleton.tsx',
  'src/components/button/button-group.tsx',
  'src/components/input/input-group.tsx',
  'src/components/field/label.tsx',
];
const CLIENT_ONLY_REACT = [
  'use', 'useState', 'useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useContext',
  'useReducer', 'useRef', 'useId', 'useSyncExternalStore', 'useMemo', 'useCallback',
  'useTransition', 'useDeferredValue', 'useOptimistic', 'useActionState', 'createContext',
];
const noComponentsOrProviders = {
  group: ['**/components/**', '**/providers/**'],
  message: 'Pure modules (types, i18n, tokens, lib) must not import components or providers (INV-011).',
};

function edgePattern(name) {
  const allowed = ALLOWED_EDGES[name] ?? [];
  const lookahead = allowed.length ? `(?!(?:${allowed.join('|')})/)` : '';
  return {
    regex: `^\\.\\./${lookahead}[^./][^/]*/`,
    message: `Component edge not allowed for ${name} (architecture §5, INV-011).`,
  };
}

// One config per component folder; server-compatible files get the edge rule
// merged with the server restrictions (a later config would replace the rule).
function componentRules(name) {
  const serverFiles = SERVER_COMPATIBLE.filter((file) => file.startsWith(`src/components/${name}/`));
  return [
    {
      files: [`src/components/${name}/**/*.{ts,tsx}`],
      ignores: ['**/*.test.{ts,tsx}', ...serverFiles],
      rules: { 'no-restricted-imports': ['error', { patterns: [edgePattern(name)] }] },
    },
    ...serverFiles.map((file) => ({
      files: [file],
      rules: {
        'no-restricted-imports': ['error', {
          paths: [{ name: 'react', importNames: CLIENT_ONLY_REACT, message: 'Server-compatible components use no hooks or context (D-014).' }],
          patterns: [
            edgePattern(name),
            { group: ['**/providers/**'], message: 'Server-compatible components must not import providers (INV-011).' },
            { group: ['@base-ui/*', '@base-ui/**'], message: 'Server-compatible components render plain HTML (D-014).' },
          ],
        }],
      },
    })),
  ];
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'showcase/dist/**', 'node_modules/**', 'fixtures/**', 'test-results/**', 'playwright-report/**', '.sdcorejs/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    files: ['src/**/*.tsx', 'test/**/*.tsx', 'showcase/src/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': ['error', {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: 'Nova never renders raw HTML (INV-010).',
      }],
    },
  },
  {
    files: ['src/types/**', 'src/i18n/**', 'src/tokens/**', 'src/lib/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [noComponentsOrProviders] }] },
  },
  {
    files: ['src/providers/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/components/**'], message: 'Providers must not import components (INV-011).' }],
      }],
    },
  },
  ...COMPONENTS.flatMap(componentRules),
);
