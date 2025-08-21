import js from '@eslint/js';
import plugingImport from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src/routeTree.gen.ts'] },
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
      'react-hooks/react-compiler': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'prettier/prettier': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
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
            ['^@?\\w'],
            // Internal files.
            ['^@declarations', '^@common', '^@components', '^@pages', '^@/'],
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
