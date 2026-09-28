import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The orbit engine must stay portable (browser, worker, Node, shader ports) and trivially
// auditable, so its source may only import sibling files. Tests may still import vitest.
const ORBIT_IMPORT_MESSAGE =
  'packages/orbit is dependency-free: only relative imports are allowed (no packages, DOM or Node built-ins).';

export default defineConfig(
  // Other tools (e.g. Kilo) check out worktrees inside the repo; those are separate checkouts.
  globalIgnores(['**/dist/**', '**/coverage/**', '.kilo/**']),
  js.configs.recommended,
  tseslint.configs.strict,
  // Pin the root: typescript-eslint refuses to guess when a nested worktree carries its own tsconfig.
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/server/**/*.ts', 'packages/fixtures/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/orbit/src/**/*.ts'],
    ignores: ['packages/orbit/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '^(?!\\.{1,2}/)', message: ORBIT_IMPORT_MESSAGE }] },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ImportExpression', message: ORBIT_IMPORT_MESSAGE },
        { selector: "CallExpression[callee.name='require']", message: ORBIT_IMPORT_MESSAGE },
      ],
    },
  },
  prettier,
);
