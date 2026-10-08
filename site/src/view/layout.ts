import { Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Design from '../design.ts'
import { Message, type Model, type ThemeChoice } from '../message.ts'
import {
  AppRoute,
  algebraRouter,
  generativeRouter,
  guideRouter,
  homeRouter,
  referenceRouter,
} from '../route.ts'

const { color, font, space, text } = Design.tokens

export const REPOSITORY_URL = 'https://github.com/Manzanita-Research/pleat'

// STYLES

const header = Style.make({
  backgroundColor: `color-mix(in oklab, ${color.canvas} 86%, transparent)`,
  borderBottom: `1px solid ${color.line}`,
}).pipe(
  Style.when(When.minWidth('48rem'), {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'saturate(1.4) blur(10px)',
  }),
)

const headerInner = Style.merge(
  Design.container,
  Style.make({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
    paddingBlock: space[3],
    flexWrap: 'wrap',
  }),
)

const brand = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  textDecoration: 'none',
  fontFamily: font.serif,
  fontSize: text.xl,
  fontStyle: 'italic',
  fontWeight: 600,
  letterSpacing: '-0.01em',
}).pipe(Style.merge(Design.focusRing))

const nav = Style.make({
  display: 'flex',
  alignItems: 'center',
  gap: space[1],
  flexWrap: 'wrap',
})

const navLink = Style.make({
  paddingBlock: space[1],
  paddingInline: space[3],
  borderRadius: 6,
  textDecoration: 'none',
  fontSize: text.sm,
  fontWeight: 500,
  color: color.muted,
}).pipe(
  Style.merge(Design.focusRing),
  Style.when(When.hover, { color: color.ink, backgroundColor: color.sunken }),
  Style.when(When.current, { color: color.ink, backgroundColor: color.sunken }),
)

const main = Style.make({ flexGrow: 1, paddingBlock: space[8] })

const footer = Style.make({
  borderTop: `1px solid ${color.line}`,
  paddingBlock: space[6],
  fontSize: text.sm,
  color: color.muted,
})

const footerInner = Style.merge(
  Design.container,
  Style.make({
    display: 'flex',
    justifyContent: 'space-between',
    gap: space[4],
    flexWrap: 'wrap',
  }),
)

// VIEW

const NAV_ITEMS: ReadonlyArray<
  readonly [label: string, href: string, tag: AppRoute['_tag']]
> = [
  ['Guide', guideRouter(), 'Guide'],
  ['Algebra', algebraRouter(), 'Algebra'],
  ['Generative', generativeRouter(), 'Generative'],
  ['Reference', referenceRouter(), 'Reference'],
]

const THEMES: ReadonlyArray<ThemeChoice> = ['System', 'Light', 'Dark']

export const themeSwitch = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Role('group'), h.AriaLabel('Color theme'), ...css(Design.segment)],
    THEMES.map(theme =>
      h.button(
        [
          h.Type('button'),
          h.AriaPressed(model.theme === theme ? 'true' : 'false'),
          h.OnClick(Message.ClickedTheme({ theme })),
          ...css(Design.segmentButton),
        ],
        [theme],
      ),
    ),
  )

export const layoutView = (model: Model, h: HtmlBuilder<Message>, content: Html): Html =>
  h.div(
    [h.DataAttribute('theme', model.theme), ...css(Design.page)],
    [
      h.header(
        [...css(header)],
        [
          h.div(
            [...css(headerInner)],
            [
              h.a(
                [h.Href(homeRouter()), h.AriaLabel('Pleat home'), ...css(brand)],
                [h.span([...css(Design.pleatMark)]), 'pleat'],
              ),
              h.nav(
                [h.AriaLabel('Main'), ...css(nav)],
                [
                  ...NAV_ITEMS.map(([label, href, tag]) =>
                    h.a(
                      [
                        h.Href(href),
                        ...(model.route._tag === tag ? [h.AriaCurrent('page')] : []),
                        ...css(navLink),
                      ],
                      [label],
                    ),
                  ),
                  h.a([h.Href(REPOSITORY_URL), ...css(navLink)], ['GitHub']),
                ],
              ),
              themeSwitch(model, h),
            ],
          ),
        ],
      ),
      h.main([h.Id('content'), ...css(main)], [content]),
      h.footer(
        [...css(footer)],
        [
          h.div(
            [...css(footerInner)],
            [
              h.span([], ['Pleat is made by Manzanita Research. MIT licensed.']),
              h.span(
                [],
                [
                  'Built with Foldkit, typed with Effect, deployed by Alchemy to Cloudflare.',
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
