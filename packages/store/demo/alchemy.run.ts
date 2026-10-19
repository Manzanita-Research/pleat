import * as Alchemy from 'alchemy'
import * as Cloudflare from 'alchemy/Cloudflare'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import Page from './page.ts'
import Themes from './worker.ts'

// `alchemy dev` keeps its state in .alchemy/ on this machine and runs the
// Worker and its Durable Objects in workerd, so the demo needs no account.
const state = Layer.unwrap(
  Effect.gen(function* () {
    const isDev = yield* Alchemy.ALCHEMY_DEV
    return isDev ? Alchemy.localState() : Cloudflare.state()
  }).pipe(Effect.orDie),
)

export default Alchemy.Stack(
  'PleatStoreDemo',
  { providers: Cloudflare.providers(), state },
  Effect.gen(function* () {
    const themes = yield* Themes
    const page = yield* Page
    return { store: themes.url, page: page.url }
  }),
)
