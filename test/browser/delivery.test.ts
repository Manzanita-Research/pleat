import { Global, Sheet, Theme, Token } from '@pleat/core'
import type { Browser } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { bundle } from './bundle.ts'
import { launch } from './chromium.ts'
import type { PleatGlobal } from './pleat.ts'

// How Pleat's rules reach the page: the server's <style data-pleat>, the browser sheet the
// client inserts into, and the two together. Each expectation is a literal computed value,
// not Style.resolve, so these tests check delivery independently of the resolver.

let browser: Browser
let pleatScript: string

beforeAll(async () => {
  browser = await launch()
  pleatScript = await bundle(new URL('./pleat.ts', import.meta.url))
})

afterAll(async () => {
  await browser?.close()
})

const RED = 'rgb(255, 0, 0)'
const BLUE = 'rgb(0, 0, 255)'

const page = async (head = '', body = '<div id="probe"></div>') => {
  const opened = await browser.newPage()
  await opened.setContent(
    `<!doctype html><html><head>${head}</head><body>${body}</body></html>`,
  )
  await opened.addScriptTag({ content: pleatScript })
  return opened
}

describe('themes', () => {
  test('independent token sets at one selector all apply, on the server', async () => {
    const primitives = Token.make({ ink: Token.color }, { prefix: 'server-primitive-' })
    const semantics = Token.make({ ink: Token.color }, { prefix: 'server-semantic-' })
    Global.theme(Theme.make(primitives, { ink: 'red' }))
    Global.theme(Theme.make(semantics, { ink: 'blue' }))
    const opened = await page(Sheet.styleTag())
    const values = await opened.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      return [
        root.getPropertyValue('--server-primitive-ink'),
        root.getPropertyValue('--server-semantic-ink'),
      ]
    })
    await opened.close()
    expect(values).toEqual(['red', 'blue'])
  })

  test('independent token sets at one selector all apply, in the browser', async () => {
    const opened = await page()
    const values = await opened.evaluate(() => {
      const { Global, Sheet, Theme, Token } = (globalThis as unknown as PleatGlobal).Pleat
      const primitives = Token.make({ ink: Token.color }, { prefix: 'primitive-' })
      const semantics = Token.make({ ink: Token.color }, { prefix: 'semantic-' })
      Global.theme(Theme.make(primitives, { ink: 'red' }))
      Sheet.mount()
      Global.theme(Theme.make(semantics, { ink: 'blue' }))
      const root = getComputedStyle(document.documentElement)
      return [
        root.getPropertyValue('--primitive-ink'),
        root.getPropertyValue('--semantic-ink'),
      ]
    })
    await opened.close()
    expect(values).toEqual(['red', 'blue'])
  })

  test('a theme registered again after mounting replaces the mounted rule', async () => {
    const opened = await page()
    const result = await opened.evaluate(() => {
      const { Global, Sheet, Theme, Token } = (globalThis as unknown as PleatGlobal).Pleat
      const tokens = Token.make({ ink: Token.color }, { prefix: 'replaced-' })
      const probe = document.getElementById('probe')
      if (probe === null) {
        throw new Error('No probe element.')
      }
      probe.style.color = 'var(--replaced-ink)'
      Global.theme(Theme.make(tokens, { ink: 'red' }))
      Sheet.mount()
      const before = getComputedStyle(probe).color
      Global.theme(Theme.make(tokens, { ink: 'blue' }))
      return {
        before,
        after: getComputedStyle(probe).color,
        rendered: Sheet.render().includes(':root{--replaced-ink:blue}'),
      }
    })
    await opened.close()
    expect(result).toEqual({ before: RED, after: BLUE, rendered: true })
  })
})
