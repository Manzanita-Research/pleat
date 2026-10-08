import { Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Design from '../design.ts'
import type { Message } from '../message.ts'
import { guideRouter, homeRouter } from '../route.ts'

const { space } = Design.tokens

// STYLES

const notFound = Style.make({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: space[5],
  maxWidth: '36rem',
  marginInline: 'auto',
  textAlign: 'center',
})

const folds = Style.merge(
  Design.pleatBand,
  Style.make({ width: 'min(100%, 22rem)', height: '5.5rem' }),
).pipe(Style.when(When.all(When.canHover, When.hover), { backgroundSize: '40% 100%' }))

const lede = Style.merge(Design.lede, Style.make({ marginInline: 'auto' }))

const actions = Style.merge(
  Design.row(space[3]),
  Style.make({ justifyContent: 'center' }),
)

// VIEW

// NOTE: one prerendered 404.html answers every missing path, so the page
// must not depend on the path or hydration would disagree with it.
export const notFoundView = (h: HtmlBuilder<Message>): Html =>
  h.article(
    [...css(notFound)],
    [
      h.div([h.AriaHidden(true), ...css(folds)]),
      h.span([...css(Design.eyebrow)], ['404 · Not found']),
      h.h1([...css(Design.display)], ['Nothing is folded here']),
      h.p([...css(lede)], ['There is no page at this address. It may have moved.']),
      h.div(
        [...css(actions)],
        [
          h.a(
            [h.Href(homeRouter()), ...css(Design.button({ tone: 'Primary' }))],
            ['Go home'],
          ),
          h.a([h.Href(guideRouter()), ...css(Design.button({}))], ['Read the guide']),
        ],
      ),
    ],
  )
