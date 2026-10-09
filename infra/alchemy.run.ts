import * as Alchemy from 'alchemy'
import * as Cloudflare from 'alchemy/Cloudflare'
import * as Effect from 'effect/Effect'
import { fileURLToPath } from 'node:url'

// The docs site: a Foldkit app prerendered to static pages, served as
// Workers static assets with no Worker code in front of them.
const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url))

export const Docs = Cloudflare.Website.StaticSite('Docs', {
  command: 'pnpm install --frozen-lockfile && pnpm site:build',
  cwd: REPOSITORY_ROOT,
  outdir: 'site/dist/client',
  memo: {
    include: [
      'packages/*/src/**',
      'packages/*/package.json',
      'site/src/**',
      'site/scripts/**',
      'site/vite.config.ts',
      'site/package.json',
      'package.json',
      'pnpm-workspace.yaml',
      'pnpm-lock.yaml',
      'tsconfig.base.json',
    ],
  },
  assets: {
    notFoundHandling: '404-page',
    htmlHandling: 'auto-trailing-slash',
  },
})

export default Alchemy.Stack(
  'Pleat',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const docs = yield* Docs
    return { url: docs.url }
  }),
)
