# Agent notes

Pleat is a styling library for Foldkit and Effect v4. Read `README.md` first, then `FOLDKIT.md` for the docs app.

## Framework references and skills

- `repos/foldkit` is a read-only git subtree pinned to `foldkit@0.167.0`, matching the site and adapter. Read its source and examples before guessing at Foldkit APIs. Never import from the subtree.
- `.agents/skills` exposes Foldkit, generate-program, audit-program, and Effect skills. `.claude/skills` links to the same skills. Foldkit skills link directly to the subtree, so a subtree update updates them too.
- After upgrading Foldkit, re-pin the subtree and replace `FOLDKIT.md` from its scaffolder template. See `README.md` for the commands.
- Foldkit application conventions apply to `site`, including its displayed snippets. The core styling algebra and browser harness are libraries and test infrastructure, not Foldkit Models or updates.

## Layout

- `packages/core`: the algebra. Depends only on `effect` (peer) and `csstype` (types).
- `packages/foldkit`: the Foldkit adapter. `src/server.ts` is a separate entry so server code stays out of client bundles.
- `site`: the docs site, a Foldkit SSG app styled only with Pleat. Snippets shown on the site live in `site/src/snippet` and are typechecked; import them with `?raw`.
- `infra`: the private workspace package containing the Alchemy stack that deploys the site. It shares the root lockfile and tooling, with its own Effect dependency matching Alchemy.
- `test/browser`: a private workspace for the Chromium test that the compiled cascade matches `Style.resolve`.
- `bench`: a private workspace for the render benchmark and its comparison dependencies. Update `bench/RESULTS.md` when the numbers move.

## Conventions

- Follow Foldkit's conventions for code and prose: capitalized Schema literals, `is` prefixes for booleans, `Readonly<{...}>`, `Array<T>` over `T[]`, no em dashes in prose, TSDoc on every public export.
- Workspace packages resolve to source through the `@pleat/source` export condition. Vite, Vitest, TypeScript, and the benchmark all set it.
- Class names are a contract between server and client. A change to hashing, atom keys, or condition keys changes every class name; treat it as breaking.
- A law or cascade test that has never failed is not evidence. When you change the compiler, break it on purpose and watch the browser test catch it.
- Run `pnpm format` (oxfmt) before committing. CI checks it.
- `pnpm lint` runs oxlint across all owned code, including infrastructure. The site extends the root rules with Foldkit’s recommended application rules.

## Dependency ownership

- Root devDependencies are shared workspace tooling only. Declare a dependency in the workspace that imports it.
- Benchmark comparisons belong in `bench`; Tailwind belongs only in `test/browser` for interoperability tests. Do not add either to the libraries or site.
- Keep one pnpm workspace and lockfile. Alchemy dependencies belong in `infra/package.json`; pnpm can resolve its Effect version separately from Foldkit’s.
- Keep `repos/` out of workspace globs, formatting, linting, builds, and application imports.

## Commands

`pnpm check` runs what CI runs: formatting, linting, typecheck, unit tests, build, the browser test, and the site build. The browser test needs Chromium: Playwright's (`pnpm chromium:install`) or `CHROMIUM_PATH`. A root install covers infra, and recursive typechecking checks it too. `pnpm site:deploy` runs its Alchemy stack.
