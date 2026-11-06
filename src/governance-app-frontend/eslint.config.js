import css from '@eslint/css';
import js from '@eslint/js';
import plugingImport from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import { tailwind4 } from 'tailwind-csstree';
import tseslint from 'typescript-eslint';

const hasKey = (property, name) =>
  property.type === 'Property' &&
  !property.computed &&
  (property.key.name ?? property.key.value) === name;

// A spread can hold `staleTime`, so the rule skips options that have one.
const routeLoaderStaleTime = {
  meta: {
    type: 'problem',
    docs: { description: 'Require `staleTime` on a file route that has a `loader`.' },
    schema: [],
    messages: {
      missingStaleTime:
        'A route with a `loader` must set `staleTime`, usually `Infinity`. Modal state lives in search params, and with the default of 0 each modal toggle reruns the loader.',
    },
  },
  create: (context) => ({
    'CallExpression[callee.callee.name="createFileRoute"]'(node) {
      const [options] = node.arguments;
      if (options?.type !== 'ObjectExpression') return;

      const { properties } = options;
      const loader = properties.find((property) => hasKey(property, 'loader'));
      const isOpen = properties.some((property) => property.type === 'SpreadElement');
      const hasStaleTime = properties.some((property) => hasKey(property, 'staleTime'));

      if (loader && !isOpen && !hasStaleTime) {
        context.report({ node: loader, messageId: 'missingStaleTime' });
      }
    },
  }),
};

const KEY_PATH_NODES = ['MemberExpression', 'TSAsExpression', 'TSNonNullExpression'];

const isKeyPath = (node) => {
  let root = node.type === 'ChainExpression' ? node.expression : node;
  while (KEY_PATH_NODES.includes(root.type)) root = root.object ?? root.expression;
  return root !== node && root.type === 'Identifier' && root.name === '$';
};

const selectorBranches = (node) =>
  node.type === 'ConditionalExpression'
    ? [...selectorBranches(node.consequent), ...selectorBranches(node.alternate)]
    : [node];

// The repository names the i18next selector parameter `$` in each `t()` and `i18nKey`.
// A ternary is valid: only one branch runs, so the selector reads one key.
const i18nSingleKey = {
  meta: {
    type: 'problem',
    docs: { description: 'Require each i18n selector to read one key.' },
    schema: [],
    messages: {
      notOneKey:
        'An i18n selector must read one key: `$.a.b`, `$.a[key]`, or `condition ? $.a : $.b`. A second read of `$` throws a revoked-proxy error or gives a wrong key. Use one `t()` call for each key.',
    },
  },
  create: (context) => ({
    'ArrowFunctionExpression[params.0.name="$"]'(node) {
      const branches = selectorBranches(node.body);
      const [selectorParam] = context.sourceCode.getDeclaredVariables(node);

      // Equal counts mean that the condition and the computed keys do not read `$`.
      const readsOneKey =
        branches.every(isKeyPath) && selectorParam.references.length === branches.length;

      if (!readsOneKey) context.report({ node, messageId: 'notOneKey' });
    },
  }),
};

export const localRules = {
  'i18n-single-key': i18nSingleKey,
  'route-loader-stale-time': routeLoaderStaleTime,
};

const tsConfiguration = tseslint.config(
  // @TODO: Revisit and fix integration errors with tailwind&shadcn
  { ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts', 'src/app/styles/main.css'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      import: plugingImport,
      governance: { rules: localRules },
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

      'governance/i18n-single-key': 'error',
      'governance/route-loader-stale-time': 'error',

      'prettier/prettier': 'error',
      'eol-last': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/first': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side effect imports.
            ['^\\u0000'],
            // Node.js builtins.
            ['^node:'],
            // External packages.
            ['^@icp-sdk', '^@?\\w'],
            // Internal files.
            ['^@declarations'],
            ['^@features'],
            [
              '^@components',
              '^@constants',
              '^@contexts',
              '^@hooks',
              '^@typings',
              '^@utils',
              '^@fixtures',
              '^@common',
            ],
            ['^@routes', '^@/'],
            // Relative imports.
            ['^\\.'],
            // Anything not matched in another group.
            ['^'],
          ],
        },
      ],
    },
  },
  // TanStack Router route files export `Route` (a config object, not a component) and define
  // components locally — this is the framework convention. HMR is handled by TanStack Router itself.
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);

const cssConfiguration = {
  files: ['**/*.css'],
  ignores: ['dist', 'node_modules'],
  plugins: {
    css,
    prettier,
  },
  languageOptions: {
    customSyntax: tailwind4,
  },
  language: 'css/css',
  rules: {
    'css/no-invalid-properties': 'error',
    'css/no-duplicate-imports': 'error',
    'css/no-invalid-at-rules': 'error',
    'css/no-empty-blocks': 'error',
  },
};

export default tsConfiguration.concat(cssConfiguration);
