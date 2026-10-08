import { Recipe, Sheet, Style, Var, When } from '@pleat/core'
import { Effect } from 'effect'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { Server } from 'foldkit/experimental'
import { describe, expect, test } from 'vitest'

import { className, css } from '../src/index.ts'
import { renderDocument } from '../src/server.ts'

const card = Style.make({ display: 'grid', gap: 12, padding: 16 }).pipe(
  Style.when(When.hover, { backgroundColor: 'rgb(240, 240, 240)' }),
)
const selectedRing = Style.make({ outline: '2px solid rgb(29, 78, 216)' })
const unusedOnThisPage = Style.make({ color: 'rgb(1, 1, 1)', letterSpacing: '0.3em' })
const progress = Var.number('progress')
const bar = Style.make({ width: `calc(${progress} * 1%)` })

const button = Recipe.make({
  name: 'Button',
  variants: { tone: { Primary: { color: 'white' }, Neutral: { color: 'black' } } },
  defaults: { tone: 'Neutral' },
})

type Model = Readonly<{ isSelected: boolean; percent: number }>

const view = (model: Model, h: HtmlBuilder<never>): Document => ({
  title: 'Pleat',
  body: h.main(
    [...css(card, model.isSelected ? selectedRing : Style.empty)],
    [
      h.div([...css(bar, Var.bind(progress, model.percent))]),
      h.button([h.Type('button'), ...css(button({ tone: 'Primary' }))], ['Save']),
      h.p([...css(className('prose'), card)], ['Mixed with a class Pleat does not own.']),
    ],
  ),
})

const render = (model: Model) =>
  Effect.runPromise(
    Server.renderToString({ init: () => ({ model }), view }, { isHydratable: false }),
  )

describe('css', () => {
  test('puts one class attribute with merged atoms on each element', async () => {
    const { html } = await render({ isSelected: true, percent: 42 })
    const merged = Style.merge(card, selectedRing)
    expect(html).toContain(`<main class="${merged.className}"`)
    expect(html).toContain(`class="${button({ tone: 'Primary' }).className}"`)
    expect(html).toContain(`class="${card.className} prose"`)
  })

  test('binds variables in one inline style', async () => {
    const { html } = await render({ isSelected: false, percent: 42 })
    expect(html).toContain(`class="${bar.className}" style="--progress: 42"`)
  })

  test('returns the same attributes for the same style without allocating', () => {
    expect(css(card)).toBe(css(card))
    expect(css(Style.merge(card, selectedRing))).toBe(css(card, selectedRing))
    expect(css(Style.empty)).toEqual([])
  })

  test('rejects class names that are not class names', () => {
    expect(() => className('ok "><script>')).toThrow()
  })
})

describe('renderDocument', () => {
  const assets = { entryScript: '/entry.js', stylesheets: [], modulePreloads: [] }

  test('puts the page’s critical CSS in the head', async () => {
    const application = await render({ isSelected: true, percent: 10 })
    const document = renderDocument()(application, assets)
    const head = document.slice(0, document.indexOf('</head>'))
    expect(head).toContain('<style data-pleat>')
    expect(head).toContain('@layer pleat.globals, pleat.themes, pleat.atoms;')
    for (const atomClass of card.className.split(' ')) {
      expect(head).toContain(`.${atomClass}`)
    }
    for (const atomClass of unusedOnThisPage.className.split(' ')) {
      expect(head).not.toContain(`.${atomClass}`)
    }
  })

  test('can ship the whole sheet instead', async () => {
    const application = await render({ isSelected: false, percent: 10 })
    const document = renderDocument({ isCritical: false, head: '<meta name="x">' })(
      application,
      assets,
    )
    expect(document).toContain('<meta name="x"><style data-pleat>')
    expect(document).toContain(Sheet.render())
  })
})
