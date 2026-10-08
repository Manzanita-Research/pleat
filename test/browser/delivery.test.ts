import { Global, Sheet, Style, Theme, Token, When } from '@pleat/core'
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
const GREEN = 'rgb(0, 128, 0)'

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

describe('hydration', () => {
  // The supported model: the server sends one <style data-pleat> with the atoms its HTML
  // uses, and the client loads the same styles and inserts more atoms as views use them.
  // Server-rendered elements the client never touches must keep their cascade throughout.

  const base = Style.make({ color: 'red' })
  const open = base.pipe(Style.when(When.open, { color: 'blue' }))
  const dark = Style.empty.pipe(Style.when(When.dark, { color: 'green' }))

  test('an untouched server element keeps its cascade while the client uses a subset of its atoms', async () => {
    const html = `<div id="server" data-open class="${open.className}"></div>`
    const opened = await page(Sheet.styleTag(html), html)
    const result = await opened.evaluate(() => {
      const { Pleat, colorOf } = globalThis as unknown as PleatGlobal
      const { Style, When } = Pleat
      const before = colorOf('server')
      const base = Style.make({ color: 'red' })
      const client = document.createElement('div')
      client.id = 'client'
      client.className = Style.use(base)
      document.body.append(client)
      const afterBase = colorOf('server')
      Style.use(base.pipe(Style.when(When.open, { color: 'blue' })))
      return {
        before,
        afterBase,
        afterOpen: colorOf('server'),
        client: colorOf('client'),
      }
    })
    await opened.close()
    expect(result).toEqual({
      before: BLUE,
      afterBase: BLUE,
      afterOpen: BLUE,
      client: RED,
    })
  })

  test('a conditional atom the client inserts stays below a stronger server atom', async () => {
    const html = `<div id="server" data-open class="${Style.merge(open, dark).className}"></div>`
    const opened = await page(Sheet.styleTag(html), html)
    await opened.emulateMedia({ colorScheme: 'dark' })
    const result = await opened.evaluate(() => {
      const { Pleat, colorOf } = globalThis as unknown as PleatGlobal
      const { Style, When } = Pleat
      const before = colorOf('server')
      const client = document.createElement('div')
      client.id = 'client'
      client.className = Style.use(
        Style.make({ color: 'red' }).pipe(Style.when(When.dark, { color: 'green' })),
      )
      document.body.append(client)
      return { before, after: colorOf('server'), client: colorOf('client') }
    })
    await opened.close()
    expect(result).toEqual({ before: BLUE, after: BLUE, client: GREEN })
  })

  test('server atoms the client defines only after mounting, as in a lazy chunk, are put in order', async () => {
    const html = `<div id="server" data-open class="${open.className}"></div>`
    const opened = await page(Sheet.styleTag(html), html)
    await opened.emulateMedia({ colorScheme: 'dark' })
    const result = await opened.evaluate(() => {
      const { Pleat, colorOf } = globalThis as unknown as PleatGlobal
      const { Style, When } = Pleat
      // The client hasn't defined the server's atoms yet when it inserts a new one, which
      // sorts before the server's open atom.
      const dark = Style.empty.pipe(Style.when(When.dark, { color: 'green' }))
      Style.use(dark)
      // A lazily loaded module then defines the server's atoms and uses them with it.
      const open = Style.make({ color: 'red' }).pipe(
        Style.when(When.open, { color: 'blue' }),
      )
      const client = document.createElement('div')
      client.id = 'client'
      client.setAttribute('data-open', '')
      client.className = Style.use(Style.merge(open, dark))
      document.body.append(client)
      return { server: colorOf('server'), client: colorOf('client') }
    })
    await opened.close()
    expect(result).toEqual({ server: BLUE, client: BLUE })
  })

  test('the client reuses the server rule for each global instead of adding a copy', async () => {
    const tokens = Token.make({ ink: Token.color }, { prefix: 'hydrated-' })
    Global.theme(Theme.make(tokens, { ink: 'red' }), { selector: '[data-hydrated]' })
    const html =
      '<div id="server" data-hydrated style="color: var(--hydrated-ink)"></div>'
    const opened = await page(Sheet.styleTag(html), html)
    const result = await opened.evaluate(() => {
      const { Pleat, colorOf } = globalThis as unknown as PleatGlobal
      const { Global, Sheet, Theme, Token } = Pleat
      const tokens = Token.make({ ink: Token.color }, { prefix: 'hydrated-' })
      const theme = (ink: string) =>
        Global.theme(Theme.make(tokens, { ink }), { selector: '[data-hydrated]' })
      const copies = () =>
        [...document.styleSheets, ...document.adoptedStyleSheets]
          .flatMap(sheet => [...sheet.cssRules])
          .flatMap(rule =>
            'cssRules' in rule ? [...(rule as CSSGroupingRule).cssRules] : [],
          )
          .filter(rule => rule.cssText.includes('--hydrated-ink')).length
      theme('red')
      Sheet.mount()
      const mounted = copies()
      theme('blue')
      return { mounted, replaced: copies(), color: colorOf('server') }
    })
    await opened.close()
    expect(result).toEqual({ mounted: 1, replaced: 1, color: BLUE })
  })
})
