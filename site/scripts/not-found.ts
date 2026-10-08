import { copyFileSync, existsSync } from 'node:fs'

// Workers static assets serve /404.html for missing paths. Foldkit prerenders
// /404 to 404/index.html, so copy it to the name Cloudflare looks for.
const PRERENDERED = new URL('../dist/client/404/index.html', import.meta.url)
const SERVED = new URL('../dist/client/404.html', import.meta.url)

if (!existsSync(PRERENDERED)) {
  throw new Error('dist/client/404/index.html is missing. Run vite build first.')
}
copyFileSync(PRERENDERED, SERVED)
