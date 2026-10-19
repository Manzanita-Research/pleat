import { Effect, Exit, Layer, Option, Redacted } from 'effect'
import { HttpRouter } from 'effect/http'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { Paint, Shape, Theme, Token } from '@pleat/core'

import { Catalog, Remote, Routes, Versions } from '../src/index.ts'

const light = Token.make(
  { ground: Token.color, ink: Token.color, dye: Token.color },
  { prefix: 'light-' },
)
const role = Token.make(
  {
    ground: Token.color,
    ink: Token.color,
    muted: Token.color,
    dye: Token.color,
    onDye: Token.color,
  },
  { prefix: 'role-' },
)
const look = Shape.make(role, light, ({ ground, ink, dye }) => ({
  ground,
  ink,
  muted: Paint.fade(ink, ground, 60),
  dye,
  onDye: Paint.mostLegible(dye, [ground, ink]),
}))

// Text on the dye has to read, whatever dye is published.
const dyeReads: Theme.Check = theme => {
  const value = (token: Token.Token) =>
    Option.getOrElse(Theme.resolve(theme, token), () => '')
  return Paint.contrast(value(role.onDye), value(role.dye)) >= 60
    ? undefined
    : { path: ['dye'], issue: 'Nothing reads on this dye at Lc 60' }
}

const catalog = Catalog.make({
  'house-paper': Catalog.theme(light, { shape: look, checks: [dyeReads] }),
})

const paper = { ground: '#f9f5eb', ink: '#553364', dye: '#86469c' }

const TOKEN = 'correct horse'
const ORIGIN = 'http://store.test'

const makeWeb = () =>
  HttpRouter.toWebHandler(
    Routes.make(catalog, { token: Redacted.make(TOKEN) }).pipe(
      Layer.provide(Versions.memory),
    ),
    { disableLogger: true },
  )

let web: ReturnType<typeof makeWeb>

beforeEach(() => {
  web = makeWeb()
})

afterEach(async () => {
  await web.dispose()
  vi.unstubAllGlobals()
})

const publish = (body: unknown, token = TOKEN, theme = 'house-paper') =>
  web.handler(
    new Request(`${ORIGIN}/${theme}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

const get = (path: string, headers: Record<string, string> = {}) =>
  web.handler(new Request(`${ORIGIN}${path}`, { headers }))

describe('Catalog.build', () => {
  test('derives the whole theme from what was published', async () => {
    const built = await Effect.runPromise(Catalog.build(catalog['house-paper'], paper))
    expect(built.values).toEqual(paper)
    expect(built.css).toBe(
      ':root{--role-ground:#f9f5eb;--role-ink:#553364;--role-muted:#917a96;' +
        '--role-dye:#86469c;--role-on-dye:#f9f5eb}',
    )
  })

  test('refuses values of the wrong kind and themes that fail a check', async () => {
    const wrong = await Effect.runPromiseExit(
      Catalog.build(catalog['house-paper'], { ...paper, ink: 'red;}body{' }),
    )
    expect(Exit.isFailure(wrong)).toBe(true)
    const grey = await Effect.runPromiseExit(
      Catalog.build(catalog['house-paper'], { ...paper, dye: '#9a9a9a' }),
    )
    expect(String(Exit.isFailure(grey) && grey.cause)).toContain(
      'Nothing reads on this dye',
    )
  })

  test('refuses names that would not make a path', () => {
    expect(() => Catalog.make({ 'House Paper': Catalog.theme(light) })).toThrow(
      'must be lowercase letters, digits, and dashes',
    )
  })
})

describe('the store', () => {
  test('publishes versions in order and serves the latest', async () => {
    expect((await get('/house-paper.css')).status).toBe(404)
    expect((await publish(paper)).status).toBe(201)
    const second = await publish({ ...paper, dye: '#0b699f' })
    expect(await second.json()).toEqual({
      theme: 'house-paper',
      version: 2,
      etag: '"house-paper-2"',
    })

    const css = await get('/house-paper.css')
    expect(css.headers.get('content-type')).toContain('text/css')
    expect(css.headers.get('etag')).toBe('"house-paper-2"')
    expect(css.headers.get('access-control-allow-origin')).toBe('*')
    expect(await css.text()).toContain('--role-dye:#0b699f')

    const json = await (await get('/house-paper.json')).json()
    expect(json).toMatchObject({
      theme: 'house-paper',
      version: 2,
      values: { dye: '#0b699f' },
    })
  })

  test('keeps every version, so a page can pin one', async () => {
    await publish(paper)
    await publish({ ...paper, dye: '#0b699f' })
    const first = await get('/house-paper/1.css')
    expect(first.headers.get('cache-control')).toContain('immutable')
    expect(await first.text()).toContain('--role-dye:#86469c')
    const list = await (await get('/house-paper/versions')).json()
    expect(list.versions.map((summary: { version: number }) => summary.version)).toEqual([
      1, 2,
    ])
    expect((await get('/house-paper/3.css')).status).toBe(404)
  })

  test('answers a cached copy with 304 while it is still the latest', async () => {
    await publish(paper)
    expect(
      (await get('/house-paper.css', { 'if-none-match': '"house-paper-1"' })).status,
    ).toBe(304)
    await publish({ ...paper, dye: '#0b699f' })
    expect(
      (await get('/house-paper.css', { 'if-none-match': '"house-paper-1"' })).status,
    ).toBe(200)
  })

  test('refuses a bad theme, and stores nothing', async () => {
    const refused = await publish({ ...paper, dye: '#9a9a9a' })
    expect(refused.status).toBe(422)
    expect(await refused.text()).toContain('Nothing reads on this dye')
    expect((await publish({ ...paper, ground: 'url(javascript:1)' })).status).toBe(422)
    expect((await get('/house-paper.css')).status).toBe(404)
  })

  test('needs the token to publish', async () => {
    expect((await publish(paper, 'wrong')).status).toBe(401)
    expect((await publish(paper, '')).status).toBe(401)
    expect((await get('/house-paper.css')).status).toBe(404)
  })

  test('knows only the themes in its catalog', async () => {
    expect((await publish(paper, TOKEN, 'other')).status).toBe(404)
    expect((await get('/other.css')).status).toBe(404)
    expect((await get('/constructor.css')).status).toBe(404)
  })
})

describe('Remote', () => {
  const pinned = {
    theme: 'house-paper',
    version: 1,
    values: paper,
    css: '',
    etag: '"house-paper-1"',
    publishedAt: 0,
  }

  test('reads the latest version and builds it on this side', async () => {
    await publish({ ...paper, dye: '#0b699f' })
    vi.stubGlobal('fetch', (input: string) => web.handler(new Request(input)))
    const remote = Remote.make(`${ORIGIN}/`, 'house-paper', catalog['house-paper'])
    const received = await Effect.runPromise(Remote.latest(remote))
    expect(received.version.version).toBe(1)
    expect(Theme.css(received.theme)).toContain('--role-dye:#0b699f')
  })

  test('falls back to the pinned version without a network', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')))
    const remote = Remote.make(ORIGIN, 'house-paper', catalog['house-paper'], { pinned })
    const received = await Effect.runPromise(Remote.latest(remote))
    expect(received.version.version).toBe(1)
    expect(Theme.css(received.theme)).toContain('--role-dye:#86469c')
    const unpinned = Remote.make(ORIGIN, 'house-paper', catalog['house-paper'])
    expect(Exit.isFailure(await Effect.runPromiseExit(Remote.latest(unpinned)))).toBe(
      true,
    )
  })

  test('checks what the store sends again, and falls back when it fails', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        Response.json({ ...pinned, version: 9, values: { ...paper, dye: '#9a9a9a' } }),
      ),
    )
    const remote = Remote.make(ORIGIN, 'house-paper', catalog['house-paper'], { pinned })
    const received = await Effect.runPromise(Remote.latest(remote))
    expect(received.version.version).toBe(1)
  })
})
