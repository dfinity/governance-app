# AGENTS.md

This file gives the rules for people and coding agents who work in this repository.

- `src/governance-app-frontend`: the React frontend. See [docs/FE.md](docs/FE.md).
- `src/governance-app-backend`: the Rust backend canister.
- [docs/DEVELOP.md](docs/DEVELOP.md): the Node and npm versions, and the local network.

## Setup

A new clone or git worktree has no `.env` and no backend declarations, because git ignores both.
Run these commands from the repository root, in this order:

```bash
npm ci
./scripts/config.sh -n local
npm run generate:candid-bindings
```

Unit tests read the canister IDs from `.env`. `tsc` needs the declarations.

## Validation

Run these commands in `src/governance-app-frontend` before you open a pull request:

```bash
npx tsc --noEmit -p .
npm run lint
npm run format
npm run check:i18n
npx vitest run
```

## Pull requests

The CI title check needs this format: `action(target): description`.

- `action` is one of `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `style`, `refactor`, `perf`,
  `test`. Other actions fail the check.
- `target` is one word of letters, digits, and hyphens.

## Frontend rules

The `governance/*` lint rules are in `src/governance-app-frontend/eslint.config.js`. Their tests
are in `eslint.config.test.js`.

### React Compiler

React Compiler is on for the frontend, so it memoizes components and values. Do not add `useMemo`
or `React.memo`. Some older code still has `useMemo`.

### Route loaders

Modal state lives in search params. With the default `staleTime` of 0, each modal toggle reruns
the route `loader`.

- Set `staleTime: Infinity` on each route that has a `loader`. The lint rule
  `governance/route-loader-stale-time` requires a `staleTime`.
- If a search param must refetch data, add it to `loaderDeps`. Keep modal params out of
  `loaderDeps`.

### i18n selectors

Each `t()` selector must read one key. The lint rule `governance/i18n-single-key` checks this.

- Valid forms are `$.a.b`, `$.a[key]`, and `condition ? $.a : $.b`.
- Do not read `$` two times in one run, as in `({ a: $.x.a, b: $.x.b })[key]`. This form throws a
  revoked-proxy error or gives a wrong key.
- To select from a set of keys, use one `t()` call for each key, in a `switch` or a `Record`.
- Name the selector parameter `$`. The lint rule finds selectors by this name.

### CommonJS dynamic imports

In Vite 8, `import()` of a CommonJS package gives a `default` that is the whole exports object.
In vitest, `default` is the exported value, so unit tests do not find this fault.

- Use `unwrapDefaultExport` from `src/common/ledger/ledgerUtils.ts` for such a default export.
- Run a new dynamic import in the dev server one time.

## Unit tests

- **Tooltips:** `vitest.setup.ts` mocks `@components/Tooltip` in each test file, and the mock always
  shows the content. To test when a tooltip opens, use the real Radix component: call
  `vi.unmock('@components/Tooltip')` and stub `ResizeObserver`. See `ProposerBadge.test.tsx`.
- **`localStorage`:** On Node 25, the global `localStorage` in vitest has no `setItem`. Mock the
  hook that reads the storage, or replace the global with `vi.stubGlobal`. See
  `pendingDeviceStake.test.ts`.
