import * as Pleat from '@pleat/core'

/** Pleat in the page, as `globalThis.Pleat`, for tests that drive it from `page.evaluate`. */
export type PleatGlobal = Readonly<{ Pleat: typeof Pleat }>

Object.assign(globalThis, { Pleat })
