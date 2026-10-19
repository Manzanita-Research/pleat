/** A theme store for Pleat, and the client that reads it.
 *
 *  - {@link Catalog}: the themes a store keeps, each a token tree and optionally a shape.
 *  - {@link Versions}: append-only versions per theme, kept in memory or in Durable Objects.
 *  - {@link Routes}: the HTTP API, for `effect/http`'s `HttpRouter`.
 *  - {@link Remote}: reading a theme from a page, live, with a version pinned for offline.
 *
 *  The Cloudflare Worker and Durable Object are in `@pleat/store/cloudflare`.
 *
 *  @packageDocumentation */

export * as Catalog from './catalog.ts'
export * as Remote from './remote.ts'
export * as Routes from './routes.ts'
export * as Versions from './versions.ts'
