# Agent notes

Pleat is a styling library for Foldkit and Effect v4. Read `README.md` first.

## Layout

- `packages/core`: the algebra. Depends only on `effect` (peer) and `csstype` (types).
- `packages/foldkit`: the Foldkit adapter. `src/server.ts` is a separate entry so server code stays out of client bundles.
- `site`: the docs site, a Foldkit SSG app styled only with Pleat. Snippets shown on the site live in `site/src/snippet` and are typechecked; import them with `?raw`.
- `infra`: the Alchemy stack that deploys the site. It has its own lockfile and its own Effect version, because Foldkit pins the site's.
- `test/browser`: the Chromium test that the compiled cascade matches `Style.resolve`.
- `bench`: the render benchmark. Update `bench/RESULTS.md` when the numbers move.

## Conventions

- Follow Foldkit's conventions for code and prose: capitalized Schema literals, `is` prefixes for booleans, `Readonly<{...}>`, `Array<T>` over `T[]`, no em dashes in prose, TSDoc on every public export.
- Workspace packages resolve to source through the `@pleat/source` export condition. Vite, Vitest, TypeScript, and the benchmark all set it.
- Class names are a contract between server and client. A change to hashing, atom keys, or condition keys changes every class name; treat it as breaking.
- A law or cascade test that has never failed is not evidence. When you change the compiler, break it on purpose and watch the browser test catch it.
- Run `pnpm format` before committing. CI checks it.

## Commands

`pnpm check` runs what CI runs: typecheck, unit tests, build, the browser test, and the site build. The browser test needs Chromium: Playwright's (`pnpm exec playwright-core install chromium`) or `CHROMIUM_PATH`.
