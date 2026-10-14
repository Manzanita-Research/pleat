import * as Alchemy from 'alchemy'
import * as Cloudflare from 'alchemy/Cloudflare'
import * as ByteSize from 'effect/ByteSize'
import * as Config from 'effect/Config'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'

import { PkgRegistry } from '@alchemy.run/pkg/Registry'

/** The preview registry, deployed separately from the docs site. */
export default Alchemy.Stack(
  'PleatPkg',
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const domain = yield* Config.String('PKG_DOMAIN').pipe(
      Config.withDefault('pkg.manzanita.dev'),
    )
    const registry = yield* PkgRegistry('Registry', {
      worker: { name: 'pleat-pkg', domain },
      github: {
        appId: Config.String('GH_APP_ID'),
        privateKey: Config.Redacted('GH_APP_PRIVATE_KEY'),
      },
      policy: {
        repos: ['Manzanita-Research/pleat'],
        ttl: Duration.weeks(1),
        maxPackageSize: ByteSize.megabytes(10),
      },
    })
    return { url: registry.url.as<string>() }
  }),
)
