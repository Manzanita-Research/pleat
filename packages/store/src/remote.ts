import { Data, Effect, Option, Queue, Schedule, Schema, Stream } from 'effect'

import { Global, type Theme } from '@pleat/core'

import * as Catalog from './catalog.ts'
import { Version } from './versions.ts'

/** A theme in a store, as a page reads it: where the store is, which theme, how to check what
 *  comes back, and the version to fall back on when the store can't be reached. */
export interface Remote {
  readonly _tag: 'Remote'
  /** The store's base URL, such as `https://themes.example.com`. */
  readonly url: string
  readonly theme: string
  readonly entry: Catalog.Entry
  readonly pinned: Option.Option<Version>
}

/** A version the page can use: the version, and the theme built from its values on this
 *  side of the network. */
export type Received = Readonly<{ version: Version; theme: Theme.Theme }>

/** Something went wrong between the page and the store. */
export class RemoteError extends Data.TaggedError('RemoteError')<{
  readonly message: string
}> {}

/** A theme in the store at `url`. Pass `pinned`, the version's JSON saved at build time, so a
 *  page still has a theme without a network. Values from the store are decoded and checked
 *  against `entry` again here, never trusted.
 *
 *  ```ts
 *  import pinned from './house-paper.json'
 *
 *  const remote = Remote.make('https://themes.example.com', 'house-paper', catalog['house-paper'], { pinned })
 *  ``` */
export const make = (
  url: string,
  theme: string,
  entry: Catalog.Entry,
  options: Readonly<{ pinned?: unknown }> = {},
): Remote => ({
  _tag: 'Remote',
  url: url.replace(/\/+$/, ''),
  theme,
  entry,
  pinned:
    options.pinned === undefined
      ? Option.none()
      : Option.some(Schema.decodeUnknownSync(Version)(options.pinned)),
})

const receive = (remote: Remote, input: unknown): Effect.Effect<Received, RemoteError> =>
  Schema.decodeUnknownEffect(Version)(input).pipe(
    Effect.filterOrFail(
      version => version.theme === remote.theme,
      version =>
        new RemoteError({
          message: `The store sent ${version.theme}, not ${remote.theme}.`,
        }),
    ),
    Effect.flatMap(version =>
      Effect.map(Catalog.build(remote.entry, version.values), built => ({
        version,
        theme: built.theme,
      })),
    ),
    Effect.mapError(error =>
      error._tag === 'RemoteError' ? error : new RemoteError({ message: error.message }),
    ),
  )

const fetchJson = (url: string): Effect.Effect<unknown, RemoteError> =>
  Effect.tryPromise({
    try: async signal => {
      const response = await fetch(url, {
        signal,
        headers: { accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      return (await response.json()) as unknown
    },
    catch: cause =>
      new RemoteError({
        message: `Couldn't read ${url}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  })

/** The latest version of the theme, or the pinned one when the store can't be reached or
 *  sends something that doesn't pass. Fails only when there is nothing pinned. */
export const latest = (remote: Remote): Effect.Effect<Received, RemoteError> =>
  fetchJson(`${remote.url}/${remote.theme}.json`).pipe(
    Effect.flatMap(input => receive(remote, input)),
    Effect.catch(error =>
      Option.match(remote.pinned, {
        onNone: () => Effect.fail(error),
        onSome: pinned => receive(remote, pinned),
      }),
    ),
  )

/** Applies the latest version of the theme at `selector` with `Global.theme`, for a server
 *  render: the page's stylesheet then carries the theme, so it never flashes another one. */
export const apply = (
  remote: Remote,
  options: Readonly<{ selector?: string }> = {},
): Effect.Effect<Received, RemoteError> =>
  Effect.tap(latest(remote), ({ theme }) =>
    Effect.sync(() =>
      Global.theme(theme, { selector: options.selector ?? remote.entry.selector }),
    ),
  )

type Frame = Readonly<{ _tag: 'Message'; data: string }> | Readonly<{ _tag: 'Closed' }>

const liveUrl = (remote: Remote): string =>
  `${remote.url.replace(/^http/, 'ws')}/${remote.theme}/live`

/** Every version the store publishes, starting with the latest, as it happens. The socket
 *  reconnects every 2 seconds while the store is away. A version that doesn't pass the
 *  entry's checks is skipped. In a Foldkit app, map it to a Message in a Subscription. */
export const updates = (remote: Remote): Stream.Stream<Received> =>
  Stream.callback<Frame>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const socket = new WebSocket(liveUrl(remote))
        socket.addEventListener('message', event => {
          Queue.offerUnsafe(queue, { _tag: 'Message', data: String(event.data) })
        })
        socket.addEventListener('close', () => {
          Queue.offerUnsafe(queue, { _tag: 'Closed' })
        })
        return socket
      }),
      socket => Effect.sync(() => socket.close()),
    ),
  ).pipe(
    Stream.mapEffect(frame =>
      frame._tag === 'Closed'
        ? Effect.fail(new RemoteError({ message: 'The live socket closed.' }))
        : Effect.succeed(frame.data),
    ),
    Stream.retry(Schedule.spaced('2 seconds')),
    // NOTE: the retry never gives up, so nothing fails past it.
    Stream.orDie,
    Stream.mapEffect(data =>
      Effect.try({ try: () => JSON.parse(data) as unknown, catch: () => undefined }).pipe(
        Effect.flatMap(input => receive(remote, input)),
        Effect.option,
      ),
    ),
    Stream.filter(Option.isSome),
    Stream.map(received => received.value),
  )
