import { worker } from '../src/cloudflare.ts'
import { catalog } from './catalog.ts'

export default worker('PleatThemes', { main: import.meta.url, catalog, port: 8787 })
