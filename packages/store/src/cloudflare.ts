import { RuntimeContext } from 'alchemy'
import * as Cloudflare from 'alchemy/Cloudflare'
import { Config, Effect, Layer, Option, Schema } from 'effect'
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http'

import type * as Catalog from './catalog.ts'
import * as Routes from './routes.ts'
import { type Summary, Version, Versions, next } from './versions.ts'

// NOTE: keys sort by version, so a prefix listing returns versions in order.
const PREFIX = 'version:'
const keyFor = (version: number): string =>
  `${PREFIX}${String(version).padStart(10, '0')}`

const decodeStored = Schema.decodeUnknownOption(Version)
const encode = Schema.encodeSync(Version)

/** One theme's versions, in one Durable Object named after the theme: the single writer for
 *  them, and the hub for every page watching it live. Pages hold hibernating WebSockets, so
 *  a quiet theme costs nothing between publishes. */
export class ThemeObject extends Cloudflare.DurableObject<ThemeObject>()(
  'PleatTheme',
  Effect.gen(function* () {
    const state = yield* Cloudflare.DurableObjectState

    return Effect.gen(function* () {
      const runtime = yield* RuntimeContext
      const withRuntime = <A, E>(
        effect: Effect.Effect<A, E, RuntimeContext>,
      ): Effect.Effect<A, E> => Effect.provideService(effect, RuntimeContext, runtime)

      const all = state.storage
        .list({ prefix: PREFIX })
        .pipe(
          Effect.map(stored =>
            [...stored.values()].flatMap(value => Option.toArray(decodeStored(value))),
          ),
        )
      const latest = Effect.map(all, versions => Option.fromNullishOr(versions.at(-1)))

      // NOTE: a socket that closed mid-send must not fail the publish.
      const broadcast = (version: Version) =>
        Effect.gen(function* () {
          const message = JSON.stringify(encode(version))
          const sockets = yield* state.getWebSockets()
          yield* Effect.forEach(sockets, socket => Effect.exit(socket.send(message)), {
            discard: true,
          })
        })

      // NOTE: Durable Object RPC carries plain data, so Options cross as null.
      return {
        latest: () => withRuntime(Effect.map(latest, Option.getOrNull)),
        at: (version: number) =>
          withRuntime(
            state.storage
              .get(keyFor(version))
              .pipe(Effect.map(stored => Option.getOrNull(decodeStored(stored)))),
          ),
        list: () =>
          withRuntime(
            Effect.map(all, versions =>
              versions.map(({ theme, version, etag, publishedAt }): Summary => ({
                theme,
                version,
                etag,
                publishedAt,
              })),
            ),
          ),
        append: (theme: string, draft: Readonly<{ values: unknown; css: string }>) =>
          withRuntime(
            Effect.gen(function* () {
              const version = yield* next(theme, yield* latest, draft)
              yield* state.storage.put(keyFor(version.version), encode(version))
              yield* broadcast(version)
              return version
            }),
          ),
        fetch: Effect.gen(function* () {
          const [response, socket] = yield* Cloudflare.upgrade()
          const current = yield* latest
          if (Option.isSome(current)) {
            yield* Effect.exit(socket.send(JSON.stringify(encode(current.value))))
          }
          return response
        }),
        webSocketClose: (socket: Cloudflare.WebSocket, code: number, reason: string) =>
          Effect.exit(socket.close(code, reason)).pipe(Effect.asVoid),
      }
    })
  }),
) {}

/** {@link Versions} backed by one {@link ThemeObject} per theme. Yielding it in a Worker's
 *  init also declares the Durable Object binding. */
export const versions = Effect.gen(function* () {
  const objects = yield* ThemeObject
  return Layer.succeed(
    Versions,
    Versions.of({
      latest: theme =>
        Effect.map(objects.getByName(theme).latest(), Option.fromNullishOr),
      at: (theme, version) =>
        Effect.map(objects.getByName(theme).at(version), Option.fromNullishOr),
      list: theme => objects.getByName(theme).list(),
      append: (theme, draft) => objects.getByName(theme).append(theme, draft),
      live: theme =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          return yield* objects
            .getByName(theme)
            .fetch(request)
            .pipe(
              Effect.catch(() =>
                Effect.succeed(
                  HttpServerResponse.text('The live channel is unavailable.', {
                    status: 502,
                  }),
                ),
              ),
            )
        }),
    }),
  )
})

/** A Worker that serves `catalog` from Durable Objects, with the routes in {@link Routes.make}.
 *  Publishing needs the secret `PLEAT_STORE_TOKEN`, read from the environment when you
 *  deploy. Call it from your Worker's entry file and pass that file's `import.meta.url`.
 *
 *  ```ts
 *  // themes/worker.ts
 *  export default Store.worker('Themes', { main: import.meta.url, catalog })
 *  ``` */
export const worker = (
  name: string,
  options: Readonly<{
    main: string
    catalog: Catalog.Catalog
    workersDev?: boolean
    /** The port `alchemy dev` serves it on. */
    port?: number
  }>,
) =>
  Cloudflare.Worker(
    name,
    {
      main: options.main,
      workersDev: options.workersDev ?? true,
      ...(options.port === undefined
        ? {}
        : { dev: { port: options.port, strictPort: true } }),
    },
    Effect.gen(function* () {
      const token = yield* Config.Redacted('PLEAT_STORE_TOKEN')
      const store = yield* versions
      return {
        fetch: yield* HttpRouter.toHttpEffect(
          Routes.make(options.catalog, { token }).pipe(Layer.provide(store)),
        ),
      }
    }),
  )
