import { Clock, Context, Effect, Layer, Option, Ref, Schema } from 'effect'
import { type HttpServerRequest, HttpServerResponse } from 'effect/http'

// VERSIONS

/** One published version of a theme. Versions are numbered from 1 and never change, so a
 *  page can pin one and roll back to it. */
export const Version = Schema.Struct({
  theme: Schema.String,
  version: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  /** The values as published, before any shape derived the rest. */
  values: Schema.Unknown,
  /** The built theme as one rule. */
  css: Schema.String,
  /** The strong ETag every response for this version carries. */
  etag: Schema.String,
  /** When it was published, in milliseconds since the epoch. */
  publishedAt: Schema.Number,
})
export type Version = typeof Version.Type

/** A version without its values and CSS, for listing. */
export type Summary = Readonly<
  Pick<Version, 'theme' | 'version' | 'etag' | 'publishedAt'>
>

/** A version's ETag. A version never changes, so its number names its content. */
export const etagFor = (theme: string, version: number): string => `"${theme}-${version}"`

/** What a store does with versions: keeps them in order and tells live pages about new ones.
 *  In a Worker each theme is a Durable Object (`@pleat/store/cloudflare`); tests and local
 *  scripts use {@link memory}. */
export class Versions extends Context.Service<
  Versions,
  {
    readonly latest: (theme: string) => Effect.Effect<Option.Option<Version>>
    readonly at: (theme: string, version: number) => Effect.Effect<Option.Option<Version>>
    readonly list: (theme: string) => Effect.Effect<ReadonlyArray<Summary>>
    /** Appends a version that has already passed its checks, and sends it to every live
     *  page for its theme. */
    readonly append: (
      theme: string,
      draft: Readonly<{ values: unknown; css: string }>,
    ) => Effect.Effect<Version>
    /** Upgrades the current request to a WebSocket that receives the latest version now and
     *  every version after it, each as JSON. */
    readonly live: (
      theme: string,
    ) => Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      never,
      HttpServerRequest.HttpServerRequest
    >
  }
>()('@pleat/store/Versions') {}

/** The next version after `previous`, stamped now. */
export const next = (
  theme: string,
  previous: Option.Option<Version>,
  draft: Readonly<{ values: unknown; css: string }>,
): Effect.Effect<Version> =>
  Effect.map(Clock.currentTimeMillis, publishedAt => {
    const version = Option.match(previous, {
      onNone: () => 1,
      onSome: last => last.version + 1,
    })
    return {
      theme,
      version,
      values: draft.values,
      css: draft.css,
      etag: etagFor(theme, version),
      publishedAt,
    }
  })

const summarize = ({ theme, version, etag, publishedAt }: Version): Summary => ({
  theme,
  version,
  etag,
  publishedAt,
})

/** Versions kept in memory, for tests and local scripts. Live pages need a Worker, so
 *  `live` answers 501 here. */
export const memory: Layer.Layer<Versions> = Layer.effect(
  Versions,
  Effect.gen(function* () {
    const themes = yield* Ref.make<ReadonlyMap<string, ReadonlyArray<Version>>>(new Map())
    const versionsOf = (theme: string) =>
      Effect.map(Ref.get(themes), all => all.get(theme) ?? [])
    return Versions.of({
      latest: theme =>
        Effect.map(versionsOf(theme), all => Option.fromNullishOr(all.at(-1))),
      at: (theme, version) =>
        Effect.map(versionsOf(theme), all => Option.fromNullishOr(all[version - 1])),
      list: theme => Effect.map(versionsOf(theme), all => all.map(summarize)),
      append: (theme, draft) =>
        Effect.gen(function* () {
          const all = yield* versionsOf(theme)
          const version = yield* next(theme, Option.fromNullishOr(all.at(-1)), draft)
          yield* Ref.update(themes, current =>
            new Map(current).set(theme, [...all, version]),
          )
          return version
        }),
      live: () =>
        Effect.succeed(
          HttpServerResponse.text('Live updates need the Cloudflare store.', {
            status: 501,
          }),
        ),
    })
  }),
)
