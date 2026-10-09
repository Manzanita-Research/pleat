import type { Html, HtmlBuilder } from 'foldkit/html'

import { Color, Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'

import * as Design from '../design.ts'
import { Message, type Model, type ThemeChoice } from '../message.ts'
import {
  AppRoute,
  algebraRouter,
  foldkitUiRouter,
  generativeRouter,
  guideRouter,
  homeRouter,
  referenceRouter,
  themingRouter,
} from '../route.ts'

const { color, font, radius, space, text } = Design.tokens

export const REPOSITORY_URL = 'https://github.com/Manzanita-Research/pleat'

const VERSION = '0.1'

const HEADER_HEIGHT = '3.75rem'

const wide = When.minWidth('64rem')

// STYLES

const skipLink = Style.make({
  position: 'absolute',
  insetInlineStart: space[3],
  top: space[2],
  zIndex: 30,
  paddingBlock: space[2],
  paddingInline: space[3],
  borderRadius: radius.md,
  backgroundColor: color.ink,
  color: color.canvas,
  fontSize: text.sm,
  fontWeight: 600,
  textDecoration: 'none',
  transform: 'translateY(-200%)',
}).pipe(Style.when(When.focus, { transform: 'none' }))

const header = Style.make({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: Color.alpha(color.canvas, 0.82),
  borderBottom: `1px solid ${color.line}`,
  backdropFilter: 'saturate(1.6) blur(12px)',
})

const headerInner = Style.merge(
  Design.container,
  Style.make({
    height: HEADER_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    gap: space[4],
  }),
)

const brand = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  textDecoration: 'none',
  fontFamily: font.serif,
  fontSize: '1.625rem',
  lineHeight: 1,
  letterSpacing: '-0.01em',
  borderRadius: radius.sm,
}).pipe(Style.merge(Design.focusRing))

const versionTag = Style.make({
  display: 'none',
  paddingBlock: 2,
  paddingInline: space[2],
  borderRadius: 999,
  border: `1px solid ${color.line}`,
  fontFamily: font.mono,
  fontSize: '0.6875rem',
  lineHeight: 1.4,
  color: color.muted,
}).pipe(Style.when(When.minWidth('30rem'), { display: 'inline-block' }))

const topNav = Style.make({
  display: 'none',
  alignItems: 'center',
  gap: space[1],
  marginInlineStart: 'auto',
}).pipe(Style.when(When.minWidth('44rem'), { display: 'flex' }))

const topLink = Style.make({
  paddingBlock: space[2],
  paddingInline: space[3],
  borderRadius: radius.md,
  textDecoration: 'none',
  fontSize: text.sm,
  fontWeight: 500,
  color: color.muted,
}).pipe(
  Style.merge(Design.focusRing),
  Style.when(When.hover, { color: color.ink }),
  Style.when(When.current, { color: color.ink }),
)

const headerTools = Style.make({
  display: 'flex',
  alignItems: 'center',
  gap: space[2],
  marginInlineStart: 'auto',
}).pipe(Style.when(When.minWidth('44rem'), { marginInlineStart: 0 }))

const iconSegment = Style.merge(
  Design.segment,
  Style.make({ padding: 2, borderRadius: 999 }),
)

const iconSegmentButton = Style.merge(
  Design.segmentButton,
  Style.make({
    width: 30,
    height: 28,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: 999,
  }),
)

const icon = Style.make({ width: 16, height: 16, flexShrink: 0 })

const menuButton = Style.merge(
  Design.button({ tone: 'Neutral', size: 'Small' }),
  Style.make({ borderRadius: 999 }),
).pipe(Style.when(wide, { display: 'none' }))

const menuPanel = Style.make({
  borderBottom: `1px solid ${color.line}`,
  backgroundColor: color.canvas,
  boxShadow: Design.tokens.shadow.overlay,
}).pipe(Style.when(wide, { display: 'none' }))

const menuInner = Style.merge(
  Design.container,
  Style.make({
    display: 'grid',
    gap: space[5],
    paddingBlock: space[5],
  }),
).pipe(
  Style.when(When.minWidth('36rem'), {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
)

const docsShell = Style.merge(
  Design.container,
  Style.make({ display: 'grid', gap: space[7] }),
).pipe(
  Style.when(wide, {
    gridTemplateColumns: '14.5rem minmax(0, 1fr)',
    gap: space[8],
  }),
)

const sidebar = Style.make({ display: 'none' }).pipe(
  Style.when(wide, {
    display: 'flex',
    flexDirection: 'column',
    gap: space[6],
    position: 'sticky',
    top: HEADER_HEIGHT,
    alignSelf: 'start',
    maxHeight: `calc(100vh - ${HEADER_HEIGHT})`,
    overflowY: 'auto',
    paddingBlock: space[7],
    paddingInlineEnd: space[3],
  }),
)

const navGroup = Style.make({ display: 'flex', flexDirection: 'column', gap: space[2] })

const navGroupTitle = Style.make({
  fontFamily: font.mono,
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: color.muted,
  paddingInline: space[3],
})

const navList = Style.make({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
})

const navLink = Style.make({
  display: 'block',
  paddingBlock: '0.4375rem',
  paddingInline: space[3],
  borderRadius: radius.md,
  textDecoration: 'none',
  fontSize: text.sm,
  fontWeight: 500,
  color: color.muted,
}).pipe(
  Style.merge(Design.focusRing),
  Style.when(When.hover, { color: color.ink, backgroundColor: Design.tint }),
  Style.when(When.current, {
    color: color.ink,
    backgroundColor: Design.tint,
    boxShadow: `inset 2px 0 0 ${color.accent}`,
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
  }),
)

// NOTE: on the widest screens the docs keep a column free for the fixed
// "On this page" rail from prose.ts.
const docsMain = Style.make({
  minWidth: 0,
  paddingBlock: space[7],
}).pipe(
  Style.when(wide, { paddingBlock: space[8] }),
  Style.when(When.minWidth('86rem'), { paddingInlineEnd: '15rem' }),
)

const homeMain = Style.make({ flexGrow: 1 })

const standaloneMain = Style.merge(
  Design.container,
  Style.make({ flexGrow: 1, paddingBlock: space[9] }),
)

const main = Style.make({ flexGrow: 1 })

const footer = Style.make({
  borderTop: `1px solid ${color.line}`,
  backgroundColor: color.sunken,
  fontSize: text.sm,
  color: color.muted,
})

const footerInner = Style.merge(
  Design.container,
  Style.make({
    display: 'grid',
    gap: space[6],
    paddingBlock: space[7],
  }),
).pipe(
  Style.when(When.minWidth('48rem'), {
    gridTemplateColumns: 'minmax(0, 2fr) repeat(2, minmax(0, 1fr))',
  }),
)

const footerBrand = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
  maxWidth: '24rem',
})

const footerTitle = Style.merge(navGroupTitle, Style.make({ paddingInline: 0 }))

const footerLinks = Style.make({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: space[2],
})

const footerLink = Style.make({ color: color.ink, textDecoration: 'none' }).pipe(
  Style.merge(Design.focusRing),
  Style.when(When.hover, {
    textDecorationLine: 'underline',
    textDecorationColor: color.accent,
    textUnderlineOffset: '0.22em',
  }),
)

const footerBase = Style.merge(
  Design.container,
  Style.make({
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space[3],
    paddingBlock: space[4],
    borderTop: `1px solid ${color.line}`,
    fontSize: text.xs,
  }),
)

// NAVIGATION

type NavLink = readonly [label: string, href: string, tag: AppRoute['_tag']]

type NavGroup = Readonly<{ title: string; links: ReadonlyArray<NavLink> }>

/** The docs sidebar, grouped. New pages add a link to the group they belong to. */
export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    title: 'Start',
    links: [
      ['Overview', homeRouter(), 'Home'],
      ['Guide', guideRouter(), 'Guide'],
    ],
  },
  {
    title: 'Concepts',
    links: [
      ['The algebra', algebraRouter(), 'Algebra'],
      ['Theming', themingRouter(), 'Theming'],
    ],
  },
  {
    title: 'Integrations',
    links: [
      ['Generative interfaces', generativeRouter(), 'Generative'],
      ['Foldkit UI', foldkitUiRouter(), 'FoldkitUi'],
    ],
  },
  {
    title: 'Reference',
    links: [['API reference', referenceRouter(), 'Reference']],
  },
]

const isDocsRoute = (route: AppRoute): boolean =>
  route._tag !== 'Home' && route._tag !== 'NotFound'

const navGroupsView = (model: Model, h: HtmlBuilder<Message>): ReadonlyArray<Html> =>
  NAV_GROUPS.map(group =>
    h.div(
      [...css(navGroup)],
      [
        h.span([...css(navGroupTitle)], [group.title]),
        h.ul(
          [...css(navList)],
          group.links.map(([label, href, tag]) =>
            h.li(
              [],
              [
                h.a(
                  [
                    h.Href(href),
                    ...(model.route._tag === tag ? [h.AriaCurrent('page')] : []),
                    ...css(navLink),
                  ],
                  [label],
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  )

// ICONS

const ICON_PATHS: Readonly<Record<ThemeChoice | 'Menu' | 'Close', string>> = {
  System: 'M2.5 3.5h11v7h-11zM6 13.5h4M8 10.5v3',
  Light:
    'M8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5zM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06',
  Dark: 'M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1z',
  Menu: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11',
  Close: 'M4 4l8 8M12 4l-8 8',
}

const iconView = (h: HtmlBuilder<Message>, name: keyof typeof ICON_PATHS): Html =>
  h.svg(
    [
      h.ViewBox('0 0 16 16'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.4'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.AriaHidden(true),
      ...css(icon),
    ],
    [h.path([h.D(ICON_PATHS[name])])],
  )

// VIEW

const THEMES: ReadonlyArray<ThemeChoice> = ['System', 'Light', 'Dark']

const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  System: 'Match the system theme',
  Light: 'Light theme',
  Dark: 'Dark theme',
}

export const themeSwitch = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Role('group'), h.AriaLabel('Color theme'), ...css(iconSegment)],
    THEMES.map(theme =>
      h.button(
        [
          h.Type('button'),
          h.AriaLabel(THEME_LABELS[theme]),
          h.Title(THEME_LABELS[theme]),
          h.AriaPressed(model.theme === theme ? 'true' : 'false'),
          h.OnClick(Message.ClickedTheme({ theme })),
          ...css(iconSegmentButton),
        ],
        [iconView(h, theme)],
      ),
    ),
  )

const headerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.header(
    [...css(header)],
    [
      h.div(
        [...css(headerInner)],
        [
          h.a(
            [h.Href(homeRouter()), h.AriaLabel('Pleat home'), ...css(brand)],
            [h.span([...css(Design.pleatMark)]), 'Pleat'],
          ),
          h.span([...css(versionTag)], [`v${VERSION}`]),
          h.nav(
            [h.AriaLabel('Main'), ...css(topNav)],
            [
              h.a(
                [
                  h.Href(guideRouter()),
                  ...(isDocsRoute(model.route) && model.route._tag !== 'Reference'
                    ? [h.AriaCurrent('page')]
                    : []),
                  ...css(topLink),
                ],
                ['Docs'],
              ),
              h.a(
                [
                  h.Href(referenceRouter()),
                  ...(model.route._tag === 'Reference' ? [h.AriaCurrent('page')] : []),
                  ...css(topLink),
                ],
                ['Reference'],
              ),
              h.a([h.Href(REPOSITORY_URL), ...css(topLink)], ['GitHub']),
            ],
          ),
          h.div(
            [...css(headerTools)],
            [
              themeSwitch(model, h),
              h.button(
                [
                  h.Type('button'),
                  h.AriaExpanded(model.isMenuOpen),
                  h.AriaControls('menu'),
                  h.OnClick(Message.ClickedMenuToggle()),
                  ...css(menuButton),
                ],
                [iconView(h, model.isMenuOpen ? 'Close' : 'Menu'), 'Menu'],
              ),
            ],
          ),
        ],
      ),
      ...(model.isMenuOpen
        ? [
            h.nav(
              [h.Id('menu'), h.AriaLabel('Docs'), ...css(menuPanel)],
              [h.div([...css(menuInner)], navGroupsView(model, h))],
            ),
          ]
        : []),
    ],
  )

const FOOTER_COLUMNS: ReadonlyArray<
  readonly [title: string, links: ReadonlyArray<readonly [string, string]>]
> = [
  [
    'Docs',
    [
      ['Guide', guideRouter()],
      ['The algebra', algebraRouter()],
      ['Generative interfaces', generativeRouter()],
      ['API reference', referenceRouter()],
    ],
  ],
  [
    'Project',
    [
      ['GitHub', REPOSITORY_URL],
      ['Benchmarks', `${REPOSITORY_URL}/blob/main/bench/RESULTS.md`],
      ['MIT license', `${REPOSITORY_URL}/blob/main/LICENSE`],
    ],
  ],
]

const footerView = (h: HtmlBuilder<Message>): Html =>
  h.footer(
    [...css(footer)],
    [
      h.div(
        [...css(footerInner)],
        [
          h.div(
            [...css(footerBrand)],
            [
              h.a(
                [h.Href(homeRouter()), ...css(brand)],
                [h.span([...css(Design.pleatMark)]), 'Pleat'],
              ),
              h.p(
                [],
                [
                  'Algebraic, typed styles for Foldkit and Effect v4. Made by Manzanita Research.',
                ],
              ),
            ],
          ),
          ...FOOTER_COLUMNS.map(([title, links]) =>
            h.div(
              [...css(Design.stack(space[3]))],
              [
                h.span([...css(footerTitle)], [title]),
                h.ul(
                  [...css(footerLinks)],
                  links.map(([label, href]) =>
                    h.li([], [h.a([h.Href(href), ...css(footerLink)], [label])]),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      h.div(
        [...css(footerBase)],
        [
          h.span([], ['Styled only with Pleat.']),
          h.span(
            [],
            ['Built with Foldkit, typed with Effect, deployed by Alchemy to Cloudflare.'],
          ),
        ],
      ),
    ],
  )

const bodyView = (model: Model, h: HtmlBuilder<Message>, content: Html): Html => {
  if (model.route._tag === 'Home') {
    return h.main([h.Id('content'), ...css(homeMain)], [content])
  }
  if (model.route._tag === 'NotFound') {
    return h.main([h.Id('content'), ...css(standaloneMain)], [content])
  }
  return h.div(
    [...css(main)],
    [
      h.div(
        [...css(docsShell)],
        [
          h.nav([h.AriaLabel('Docs'), ...css(sidebar)], navGroupsView(model, h)),
          h.main([h.Id('content'), ...css(docsMain)], [content]),
        ],
      ),
    ],
  )
}

export const layoutView = (model: Model, h: HtmlBuilder<Message>, content: Html): Html =>
  h.div(
    [h.DataAttribute('theme', model.theme), ...css(Design.page)],
    [
      h.a([h.Href('#content'), ...css(skipLink)], ['Skip to content']),
      headerView(model, h),
      bodyView(model, h, content),
      footerView(h),
    ],
  )
