import css from '@eslint/css';
import js from '@eslint/js';
import plugingImport from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsConfiguration = tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts', 'src/untitledui'] },
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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/react-compiler': 'error',
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
            [
              '^@components',
              '^@ui',
              '^@constants',
              '^@contexts',
              '^@queries',
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
);

const cssConfiguration = {
  ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts', 'src/untitledui'],
  files: ['**/*.css'],
  plugins: {
    css,
    prettier,
  },
  language: 'css/css',
  rules: {
    'css/no-invalid-properties': 'error',
    'css/no-duplicate-imports': 'error',
    'css/no-invalid-at-rules': 'off',
    'css/no-empty-blocks': 'error',
  },
};

export default tsConfiguration.concat(cssConfiguration);
