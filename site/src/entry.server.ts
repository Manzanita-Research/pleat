import { Effect, Option } from 'effect'
import { Server } from 'foldkit/experimental'
import { fromString } from 'foldkit/url'

import { renderDocument as renderWithPleat } from '@pleat/foldkit/server'

import { FONT_URLS } from './design.ts'
import { init, view } from './main.ts'
import { NOT_FOUND_PATH, PATHS, urlToAppRoute } from './route.ts'

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23bd2703'/%3E%3Cpath d='M4 3v10M8 3v10M12 3v10' stroke='%23fdf8f3' stroke-width='1.5'/%3E%3C/svg%3E"

/** Renders the docs document with its fonts, metadata, and Pleat styles. */
export const renderDocument = renderWithPleat({
  head: [
    `<link rel="icon" href="${ICON}">`,
    '<meta name="description" content="Algebraic, typed styles for Foldkit and Effect v4. Every rule compiled before the first render.">',
    '<meta name="color-scheme" content="light dark">',
    ...FONT_URLS.map(
      url => `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin>`,
    ),
  ].join(''),
})

/** The docs pages and the not-found document generated during the build. */
export const prerenderPaths: ReadonlyArray<string> = PATHS

/** Renders a page with HTTP 404 when its route is unknown. */
export const renderPage = (request: Request): Promise<Server.EntryResult> => {
  const url = Option.getOrThrow(fromString(request.url))
  const isNotFound = urlToAppRoute(url)._tag === 'NotFound'
  // Prerendering requires status 200 for the source document copied to 404.html.
  const isNotFoundDocument =
    url.pathname === NOT_FOUND_PATH || url.pathname === `${NOT_FOUND_PATH}/`
  return Effect.runPromise(
    Server.renderToString({ routing: {}, init, view }, { url: request.url }).pipe(
      Effect.map(application =>
        Server.Rendered(application, {
          status: isNotFound && !isNotFoundDocument ? 404 : 200,
        }),
      ),
    ),
  )
}
