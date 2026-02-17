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
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

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
