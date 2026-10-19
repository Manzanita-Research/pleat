import * as Cloudflare from 'alchemy/Cloudflare'
import { Config, Effect } from 'effect'
import { HttpServerResponse } from 'effect/http'

import { Remote } from '../src/index.ts'
import { catalog } from './catalog.ts'

// A server-rendered page that wears the store's theme. The CSS is in the
// first response, so the page never shows another theme first, and a small
// script swaps it whenever the store publishes.

const live = (url: string) => `
const style = document.getElementById('theme')
const connect = () => {
  const socket = new WebSocket(${JSON.stringify(url.replace(/^http/, 'ws'))} + '/demo-paper/live')
  socket.onmessage = event => {
    const version = JSON.parse(event.data)
    style.textContent = version.css
    document.getElementById('version').textContent = 'version ' + version.version
  }
  socket.onclose = () => setTimeout(connect, 2000)
}
connect()
`

const page = (css: string, version: number, storeUrl: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A server-rendered page</title>
<style id="theme">${css}</style>
<style>
body { margin: 0; background: var(--role-ground); color: var(--role-ink); font: 18px/1.5 ui-sans-serif, system-ui, sans-serif; }
main { max-width: 36rem; margin: 0 auto; padding: 3rem 1.5rem; }
h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.5rem; }
.muted { color: var(--role-muted); }
.panel { background: var(--role-panel); border-top: 1px solid var(--role-rule); padding: 1rem 1.25rem; margin: 1.5rem 0; font-family: ui-monospace, monospace; font-size: 14px; }
.command { color: var(--role-command); }
.event { color: var(--role-event); }
button { background: var(--role-dye); color: var(--role-on-dye); border: 0; border-radius: 4px; padding: 0.5rem 1rem; font: inherit; }
</style>
</head>
<body>
<main>
<h1>A server-rendered page</h1>
<p class="muted">Its theme comes from the store, in the first response. <span id="version">version ${version}</span></p>
<div class="panel"><span class="command">PlaceOrder</span> <span class="muted">then</span> <span class="event">OrderPlaced</span></div>
<button type="button">Retry</button>
</main>
<script type="module">${live(storeUrl)}</script>
</body>
</html>`

export default Cloudflare.Worker(
  'PleatThemePage',
  { main: import.meta.url, dev: { port: 8788, strictPort: true } },
  Effect.gen(function* () {
    const storeUrl = yield* Config.String('STORE_URL')
    const remote = Remote.make(storeUrl, 'demo-paper', catalog['demo-paper'])
    return {
      fetch: Remote.latest(remote).pipe(
        Effect.map(({ version }) =>
          HttpServerResponse.html(page(version.css, version.version, storeUrl)),
        ),
        Effect.catch(error =>
          Effect.succeed(HttpServerResponse.text(error.message, { status: 503 })),
        ),
      ),
    }
  }),
)
