import { Effect, Option, Redacted, Schema } from 'effect'
import { HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http'

import * as Catalog from './catalog.ts'
import { type Version, Versions } from './versions.ts'

// NOTE: every read is public and cross-origin, since any page may wear a
// theme. Writes come from tools, not browsers, so they get no CORS headers.
const PUBLIC = { 'access-control-allow-origin': '*' }

// NOTE: the latest version can change, so caches revalidate it every time
// and get a 304 while it hasn't. A numbered version never changes.
const LATEST_CACHE = 'public, max-age=0, must-revalidate'
const PINNED_CACHE = 'public, max-age=31536000, immutable'

const FILE = /^([a-z][a-z0-9-]*)\.(css|json)$/
const PINNED = /^([1-9][0-9]*)\.(css|json)$/

const Params = Schema.Struct({ file: Schema.String })
const ThemeParams = Schema.Struct({ theme: Schema.String, file: Schema.String })
const PublishParams = Schema.Struct({ theme: Schema.String })

const problem = (status: number, message: string) =>
  HttpServerResponse.text(message, { status, headers: PUBLIC })

const unknownTheme = (theme: string) => problem(404, `No theme is named ${theme}.`)

const respond = (
  version: Version,
  format: 'css' | 'json',
  cacheControl: string,
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const headers = { ...PUBLIC, etag: version.etag, 'cache-control': cacheControl }
    if (request.headers['if-none-match'] === version.etag) {
      return HttpServerResponse.empty({ status: 304, headers })
    }
    return format === 'css'
      ? HttpServerResponse.text(version.css, {
          contentType: 'text/css; charset=utf-8',
          headers,
        })
      : yield* HttpServerResponse.json(version, { headers }).pipe(Effect.orDie)
  })

// NOTE: compares every character whatever the input, so the time a wrong
// token takes says nothing about how much of it was right.
const isSameSecret = (given: string, expected: string): boolean => {
  let difference = given.length ^ expected.length
  for (let index = 0; index < expected.length; index += 1) {
    difference |= (given.charCodeAt(index) || 0) ^ expected.charCodeAt(index)
  }
  return difference === 0
}

const BEARER = /^Bearer (.+)$/

/** The store's HTTP API for `catalog`, as routes for `effect/http`'s `HttpRouter`. Needs
 *  {@link Versions}.
 *
 *  - `GET /<theme>.css` and `GET /<theme>.json`: the latest version, with an ETag.
 *  - `GET /<theme>/<n>.css` and `GET /<theme>/<n>.json`: version `n`, cached for good.
 *  - `GET /<theme>/versions`: every version's number, ETag, and time.
 *  - `GET /<theme>/live`: a WebSocket that gets the latest version, then each new one.
 *  - `POST /<theme>` with `Authorization: Bearer <token>`: publishes the JSON body as the
 *    next version, after decoding it and running the theme's checks. A body that fails is
 *    refused with every problem listed, and nothing is stored. */
export const make = (
  catalog: Catalog.Catalog,
  options: Readonly<{ token: Redacted.Redacted<string> }>,
) =>
  HttpRouter.use(
    Effect.fn(function* (router) {
      const versions = yield* Versions
      const entryOf = (theme: string): Option.Option<Catalog.Entry> =>
        Object.hasOwn(catalog, theme)
          ? Option.fromNullishOr(catalog[theme])
          : Option.none()

      yield* router.add(
        'GET',
        '/:file',
        Effect.gen(function* () {
          const { file } = yield* HttpRouter.schemaPathParams(Params)
          const [, theme = '', format] = FILE.exec(file) ?? []
          if (format === undefined || Option.isNone(entryOf(theme))) {
            return unknownTheme(file)
          }
          const latest = yield* versions.latest(theme)
          return yield* Option.match(latest, {
            onNone: () =>
              Effect.succeed(problem(404, `${theme} has no published version yet.`)),
            onSome: version =>
              respond(version, format === 'css' ? 'css' : 'json', LATEST_CACHE),
          })
        }).pipe(
          Effect.catchTag('SchemaError', () => Effect.succeed(problem(400, 'Bad path.'))),
        ),
      )

      yield* router.add(
        'GET',
        '/:theme/:file',
        Effect.gen(function* () {
          const { theme, file } = yield* HttpRouter.schemaPathParams(ThemeParams)
          if (Option.isNone(entryOf(theme))) {
            return unknownTheme(theme)
          }
          if (file === 'versions') {
            return yield* HttpServerResponse.json(
              { theme, versions: yield* versions.list(theme) },
              { headers: { ...PUBLIC, 'cache-control': LATEST_CACHE } },
            ).pipe(Effect.orDie)
          }
          if (file === 'live') {
            return yield* versions.live(theme)
          }
          const [, number, format] = PINNED.exec(file) ?? []
          if (number === undefined || format === undefined) {
            return problem(404, `Nothing at /${theme}/${file}.`)
          }
          const pinned = yield* versions.at(theme, Number(number))
          return yield* Option.match(pinned, {
            onNone: () =>
              Effect.succeed(problem(404, `${theme} has no version ${number}.`)),
            onSome: version =>
              respond(version, format === 'css' ? 'css' : 'json', PINNED_CACHE),
          })
        }).pipe(
          Effect.catchTag('SchemaError', () => Effect.succeed(problem(400, 'Bad path.'))),
        ),
      )

      yield* router.add(
        'POST',
        '/:theme',
        Effect.gen(function* () {
          const { theme } = yield* HttpRouter.schemaPathParams(PublishParams)
          const request = yield* HttpServerRequest.HttpServerRequest
          const [, given = ''] = BEARER.exec(request.headers['authorization'] ?? '') ?? []
          if (!isSameSecret(given, Redacted.value(options.token))) {
            return HttpServerResponse.text('Publishing needs the store token.', {
              status: 401,
            })
          }
          const entry = entryOf(theme)
          if (Option.isNone(entry)) {
            return unknownTheme(theme)
          }
          const body = yield* request.json.pipe(Effect.option)
          if (Option.isNone(body)) {
            return HttpServerResponse.text('The body is not JSON.', { status: 400 })
          }
          return yield* Catalog.build(entry.value, body.value).pipe(
            Effect.flatMap(built =>
              versions.append(theme, { values: built.values, css: built.css }),
            ),
            Effect.flatMap(version =>
              HttpServerResponse.json(
                { theme, version: version.version, etag: version.etag },
                { status: 201 },
              ).pipe(Effect.orDie),
            ),
            Effect.catchTag('SchemaError', error =>
              Effect.succeed(HttpServerResponse.text(error.message, { status: 422 })),
            ),
          )
        }).pipe(
          Effect.catchTag('SchemaError', () => Effect.succeed(problem(400, 'Bad path.'))),
        ),
      )
    }),
  )
