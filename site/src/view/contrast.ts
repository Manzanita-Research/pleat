import { Recipe, Style, Theme, Var, When } from '@pleat/core'
import { css } from '@pleat/foldkit'
import { Cause, Effect, Exit, Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { codeBlock } from '../code.ts'
import { check, failures, type Pair, type Verdict, score } from '../contrast/check.ts'
import {
  CHANNEL_KEY,
  CHANNEL_RANGE,
  type Channel,
  DEMO_PAIRS,
  type Palette,
  type PalettePreset,
  SWATCH_KEY,
  type Swatch,
  decodeDemoTheme,
  demoTokens,
  oklchCss,
  paletteTheme,
  paletteValues,
} from '../contrast/demo.ts'
import {
  type Metric,
  USE_CASE_LABEL,
  type UseCase,
  apca,
  isInSrgb,
  wcag2,
} from '../contrast/metric.ts'
import { SITE_PAIRS, SITE_THEMES } from '../contrast/site.ts'
import * as Design from '../design.ts'
import { Message, type Model } from '../message.ts'
import decodeSource from '../snippet/contrastDecode.ts?raw'
import pairsSource from '../snippet/contrastPairs.ts?raw'
import testSource from '../snippet/contrastTest.ts?raw'
import { articleStyle, pageIntro } from './guide.ts'
import { bullets, paragraph, section } from './prose.ts'

const { color, font, radius, space, text } = Design.tokens

// SAMPLES

const sampleText = Var.string('sample-text')
const sampleBackground = Var.string('sample-background')

const sampleColors = (foreground: string, background: string) =>
  [Var.bind(sampleText, foreground), Var.bind(sampleBackground, background)] as const

// STYLES

const wide = Style.make({ display: 'flex', flexDirection: 'column', gap: space[5] })

const tableFrame = Style.make({
  overflowX: 'auto',
  border: `1px solid ${color.line}`,
  borderRadius: radius.lg,
  backgroundColor: color.surface,
})

const table = Style.make({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: text.sm,
  fontVariantNumeric: 'tabular-nums',
})

const tableCaption = Style.make({
  captionSide: 'top',
  textAlign: 'start',
  paddingBlock: space[3],
  paddingInline: space[4],
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.muted,
  borderBottom: `1px solid ${color.line}`,
})

const headerCell = Style.make({
  textAlign: 'start',
  paddingBlock: space[2],
  paddingInline: space[3],
  fontFamily: font.mono,
  fontSize: text.xs,
  fontWeight: 500,
  color: color.muted,
  whiteSpace: 'nowrap',
})

const cell = Style.make({
  textAlign: 'start',
  paddingBlock: space[2],
  paddingInline: space[3],
  borderTop: `1px solid ${color.line}`,
  verticalAlign: 'middle',
})

const wideCells = Style.empty.pipe(
  Style.when(When.minWidth('40rem'), { paddingInline: space[4] }),
)

const rowHeading = Style.make({ display: 'flex', flexDirection: 'column', gap: 2 })

const rowNote = Style.make({ fontWeight: 400, fontSize: text.xs, color: color.muted })

const nowrap = Style.make({ whiteSpace: 'nowrap' })

const scoreCell = Style.make({
  display: 'inline-flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: space[2],
  rowGap: 2,
  whiteSpace: 'nowrap',
})

const sampleChip = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 28,
  flexShrink: 0,
  borderRadius: radius.sm,
  border: `1px solid ${color.line}`,
  fontWeight: 600,
  color: sampleText,
  backgroundColor: sampleBackground,
})

const pairCell = Style.make({ display: 'flex', alignItems: 'center', gap: space[3] })

const verdictBadge = Recipe.make({
  base: Style.make({
    display: 'inline-flex',
    alignItems: 'center',
    gap: space[1],
    paddingInline: space[2],
    whiteSpace: 'nowrap',
    borderRadius: radius.sm,
    fontFamily: font.mono,
    fontSize: text.xs,
    fontWeight: 600,
    lineHeight: 1.6,
  }),
  variants: {
    verdict: {
      Pass: { color: color.ink, backgroundColor: color.sunken },
      Fail: { color: color.onAccent, backgroundColor: color.accent },
      Unknown: { color: color.ink, backgroundColor: color.accentSoft },
    },
  },
})

const VERDICT_LABEL: Readonly<Record<Verdict, string>> = {
  Pass: '✓ Pass',
  Fail: '✕ Fail',
  Unknown: '? Unknown',
}

const orangeFigure = Style.merge(
  Design.card,
  Style.make({ display: 'grid', gap: space[5] }),
).pipe(
  Style.when(When.minWidth('40rem'), {
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  }),
)

const orangeSample = Style.make({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 88,
  borderRadius: radius.md,
  fontSize: text.lg,
  fontWeight: 600,
  color: sampleText,
  backgroundColor: sampleBackground,
})

const scoreList = Style.make({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: space[4],
  rowGap: space[1],
  margin: 0,
  fontSize: text.sm,
  fontVariantNumeric: 'tabular-nums',
})

const scoreTerm = Style.make({ color: color.muted })

const scoreValue = Style.make({ margin: 0 })

const workbench = Style.merge(
  Design.card,
  Style.make({ display: 'grid', gap: space[6], padding: space[5] }),
).pipe(
  Style.when(When.minWidth('60rem'), {
    gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 6fr)',
  }),
)

const label = Style.make({ fontFamily: font.mono, fontSize: text.xs, color: color.muted })

const column = Style.make({ display: 'flex', flexDirection: 'column', gap: space[4] })

const { color: demo } = demoTokens

const preview = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
  padding: space[5],
  borderRadius: radius.lg,
  border: `1px solid ${color.line}`,
  backgroundColor: demo.surface,
  color: demo.text,
})

const previewTitle = Style.make({
  fontFamily: font.serif,
  fontSize: text.xl,
  fontWeight: 600,
  lineHeight: 1.2,
})

const previewMuted = Style.make({ color: demo.muted, fontSize: text.sm })

const previewLink = Style.make({
  color: demo.link,
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: '0.18em',
})

const previewActions = Style.make({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space[3],
})

const previewInput = Style.make({
  flexGrow: 1,
  minWidth: '10rem',
  paddingBlock: space[2],
  paddingInline: space[3],
  border: `1px solid ${demo.border}`,
  borderRadius: radius.md,
  backgroundColor: 'transparent',
  color: demo.text,
  fontFamily: 'inherit',
  fontSize: text.sm,
}).pipe(
  Style.merge(Design.focusRing),
  Style.when(When.placeholder, { color: demo.placeholder, opacity: 1 }),
)

const previewButton = Style.make({
  paddingBlock: space[2],
  paddingInline: space[4],
  borderRadius: radius.md,
  backgroundColor: demo.accent,
  color: demo.onAccent,
  fontWeight: 600,
  fontSize: text.sm,
})

const swatchButton = Style.merge(
  Design.segmentButton,
  Style.make({ display: 'inline-flex', alignItems: 'center', gap: space[2] }),
)

const swatchDot = Style.make({
  width: 14,
  height: 14,
  flexShrink: 0,
  borderRadius: '50%',
  border: `1px solid ${color.line}`,
  backgroundColor: sampleBackground,
})

const sliders = Style.make({ display: 'flex', flexDirection: 'column', gap: space[3] })

const slider = Style.make({
  display: 'grid',
  gridTemplateColumns: '5.5rem minmax(0, 1fr) 3.5rem',
  alignItems: 'center',
  gap: space[3],
  fontSize: text.sm,
})

const range = Style.make({ width: '100%', accentColor: color.accent }).pipe(
  Style.merge(Design.focusRing),
)

const sliderValue = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  textAlign: 'end',
  fontVariantNumeric: 'tabular-nums',
})

const cssValue = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.muted,
  overflowWrap: 'anywhere',
})

const resultRow = Style.make({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  columnGap: space[3],
  rowGap: space[1],
  alignItems: 'center',
  paddingBlock: space[3],
  borderTop: `1px solid ${color.line}`,
})

const resultName = Style.make({ fontWeight: 600, fontSize: text.sm })

const resultScores = Style.make({
  gridColumn: '2',
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: space[4],
  rowGap: space[1],
  fontSize: text.sm,
  fontVariantNumeric: 'tabular-nums',
})

const decodeBox = Recipe.make({
  base: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: space[2],
    padding: space[4],
    borderRadius: radius.md,
    border: '1px solid',
  }),
  variants: {
    isAccepted: {
      true: { borderColor: color.line, backgroundColor: color.sunken },
      false: { borderColor: color.accent, backgroundColor: color.accentSoft },
    },
  },
})

const decodeText = Style.make({
  margin: 0,
  fontFamily: font.mono,
  fontSize: text.xs,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
})

// PIECES

const verdictView = <Message>(h: HtmlBuilder<Message>, verdict: Verdict): Html =>
  h.span([...css(verdictBadge({ verdict }))], [VERDICT_LABEL[verdict]])

const scoreView = <Message>(
  h: HtmlBuilder<Message>,
  metric: Metric,
  measured: Option.Option<number>,
  verdict: Verdict,
): Html =>
  h.span(
    [...css(scoreCell)],
    [
      Option.match(measured, { onNone: () => '–', onSome: metric.format }),
      verdictView(h, verdict),
    ],
  )

const targetText = (metric: Metric, useCase: UseCase): string => {
  const target = metric.target(useCase)
  return target === undefined ? 'none' : metric.format(target)
}

const sample = <Message>(
  h: HtmlBuilder<Message>,
  foreground: Option.Option<string>,
  background: Option.Option<string>,
): Html =>
  Option.match(Option.all([foreground, background]), {
    onNone: () => h.span([...css(sampleChip)], ['?']),
    onSome: ([textValue, backgroundValue]) =>
      h.span(
        [
          h.AriaHidden(true),
          ...css(sampleChip, ...sampleColors(textValue, backgroundValue)),
        ],
        ['Aa'],
      ),
  })

// TARGETS

const capitalized = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1)

const USE_CASES: ReadonlyArray<readonly [UseCase, string]> = [
  ['BodyText', 'Paragraphs and columns of reading text. APCA prefers Lc 90.'],
  ['ContentText', 'Text people read that isn’t body text: labels, captions, buttons.'],
  ['LargeText', 'Headlines, and text at least 36px, or 24px bold.'],
  ['SpotText', 'Placeholders, disabled labels, copyright lines.'],
  ['NonText', 'Icons, input borders, and focus rings that carry meaning.'],
  ['Decoration', 'Dividers and other shapes that only need to be seen.'],
]

const targetsTable = <Message>(h: HtmlBuilder<Message>): Html =>
  h.div(
    [...css(tableFrame)],
    [
      h.table(
        [...css(table)],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                ['Use case', 'APCA', 'WCAG 2'].map(heading =>
                  h.th([h.Scope('col'), ...css(headerCell, wideCells)], [heading]),
                ),
              ),
            ],
          ),
          h.tbody(
            [],
            USE_CASES.map(([useCase, examples]) =>
              h.tr(
                [],
                [
                  h.th(
                    [h.Scope('row'), ...css(cell, wideCells)],
                    [
                      h.span(
                        [...css(rowHeading)],
                        [
                          capitalized(USE_CASE_LABEL[useCase]),
                          h.span([...css(rowNote)], [examples]),
                        ],
                      ),
                    ],
                  ),
                  h.td([...css(cell, wideCells, nowrap)], [targetText(apca, useCase)]),
                  h.td([...css(cell, wideCells, nowrap)], [targetText(wcag2, useCase)]),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

// ORANGE

// NOTE: the exact hex from the comparison. The demo's orange preset is the
// same color in OKLCH, rounded to what its sliders can reach.
const ORANGE_CSS = '#ff6600'

const ORANGE_LABELS: ReadonlyArray<readonly [name: string, css: string]> = [
  ['Black', 'oklch(0% 0 0)'],
  ['White', 'oklch(100% 0 0)'],
]

const orangeView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.figure(
    [...css(orangeFigure)],
    ORANGE_LABELS.map(([name, foreground]) =>
      h.div(
        [...css(column)],
        [
          h.div(
            [...css(orangeSample, ...sampleColors(foreground, ORANGE_CSS))],
            [`${name} on orange`],
          ),
          h.dl(
            [...css(scoreList)],
            [apca, wcag2].flatMap(metric => {
              const scored = score(foreground, ORANGE_CSS, 'ContentText', metric)
              return [
                h.dt([...css(scoreTerm)], [metric.name]),
                h.dd(
                  [...css(scoreValue)],
                  [scoreView(h, metric, scored.score, scored.verdict)],
                ),
              ]
            }),
          ),
        ],
      ),
    ),
  )

// SITE THEMES

const siteTable = <Message>(
  h: HtmlBuilder<Message>,
  themeName: string,
  pairs: ReadonlyArray<Pair>,
  theme: Theme.Theme,
): Html => {
  const apcaResults = check(theme, pairs, apca)
  const wcagResults = check(theme, pairs, wcag2)
  return h.div(
    [...css(tableFrame)],
    [
      h.table(
        [...css(table)],
        [
          h.caption([...css(tableCaption)], [`${themeName} theme`]),
          h.thead(
            [],
            [
              h.tr(
                [],
                ['Pair', 'APCA', 'WCAG 2'].map(heading =>
                  h.th([h.Scope('col'), ...css(headerCell, wideCells)], [heading]),
                ),
              ),
            ],
          ),
          h.tbody(
            [],
            apcaResults.map((result, index) => {
              const wcag = wcagResults[index] ?? result
              return h.tr(
                [],
                [
                  h.th(
                    [h.Scope('row'), ...css(cell, wideCells)],
                    [
                      h.span(
                        [...css(pairCell)],
                        [
                          sample(h, result.text, result.background),
                          h.span(
                            [...css(rowHeading)],
                            [
                              result.pair.name,
                              h.span(
                                [...css(rowNote)],
                                [capitalized(USE_CASE_LABEL[result.pair.useCase])],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  h.td(
                    [...css(cell, wideCells)],
                    [scoreView(h, apca, result.score, result.verdict)],
                  ),
                  h.td(
                    [...css(cell, wideCells)],
                    [scoreView(h, wcag2, wcag.score, wcag.verdict)],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )
}

const countFailures = (metric: Metric, theme: Theme.Theme): number =>
  failures(check(theme, SITE_PAIRS, metric)).length

const siteSummary = (): string =>
  SITE_THEMES.map(
    ([name, theme]) =>
      `In the ${name.toLowerCase()} theme, ${countFailures(apca, theme)} of ${SITE_PAIRS.length} pairs miss their APCA target and ${countFailures(wcag2, theme)} miss their WCAG 2 target.`,
  ).join(' ')

// DEMO

const PALETTE_PRESETS: ReadonlyArray<readonly [PalettePreset, string]> = [
  ['Orange', 'Orange button'],
  ['Light', 'Light'],
  ['Dark', 'This site’s dark'],
]

const SWATCHES: ReadonlyArray<readonly [Swatch, string]> = [
  ['Surface', 'Surface'],
  ['Text', 'Text'],
  ['Muted', 'Muted'],
  ['Link', 'Link'],
  ['Accent', 'Accent'],
  ['OnAccent', 'On accent'],
  ['Placeholder', 'Placeholder'],
  ['Border', 'Border'],
]

const CHANNELS: ReadonlyArray<readonly [Channel, string]> = [
  ['Lightness', 'Lightness'],
  ['Chroma', 'Chroma'],
  ['Hue', 'Hue'],
]

const formatChannel = (channel: Channel, value: number): string =>
  channel === 'Lightness'
    ? `${value.toFixed(1)}%`
    : channel === 'Chroma'
      ? value.toFixed(3)
      : `${Math.round(value)}°`

const previewView = (palette: Palette, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Role('group'),
      h.AriaLabel('Preview of the palette'),
      ...css(preview, ...Theme.bindings(paletteTheme(palette))),
    ],
    [
      h.span([...css(previewTitle)], ['Weekly report']),
      h.span(
        [],
        [
          'Signups rose 12% after the new onboarding shipped. Most of the gain came from people who started on a phone.',
        ],
      ),
      h.span([...css(previewMuted)], ['Updated two hours ago']),
      h.span([...css(previewLink)], ['See every report']),
      h.div(
        [...css(previewActions)],
        [
          h.input([
            h.Type('search'),
            h.Placeholder('Search reports'),
            h.AriaLabel('Search reports'),
            ...css(previewInput),
          ]),
          h.span([...css(previewButton)], ['Share']),
        ],
      ),
    ],
  )

const editorView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { palette, swatch, preset } = model.contrast
  const selected = palette[SWATCH_KEY[swatch]]
  const selectedCss = oklchCss(selected)
  return h.div(
    [...css(column)],
    [
      h.div(
        [h.Role('group'), h.AriaLabel('Starting palette'), ...css(Design.row(space[2]))],
        PALETTE_PRESETS.map(([option, title]) =>
          h.button(
            [
              h.Type('button'),
              h.AriaPressed(Option.contains(preset, option) ? 'true' : 'false'),
              h.OnClick(Message.ClickedPalettePreset({ preset: option })),
              ...css(
                Design.button({ size: 'Small', tone: 'Quiet' }),
                Design.segmentButton,
              ),
            ],
            [title],
          ),
        ),
      ),
      previewView(palette, h),
      h.div(
        [h.Role('group'), h.AriaLabel('Color to edit'), ...css(Design.row(space[1]))],
        SWATCHES.map(([option, title]) =>
          h.button(
            [
              h.Type('button'),
              h.AriaPressed(option === swatch ? 'true' : 'false'),
              h.OnClick(Message.PickedSwatch({ swatch: option })),
              ...css(swatchButton),
            ],
            [
              h.span(
                [
                  h.AriaHidden(true),
                  ...css(
                    swatchDot,
                    Var.bind(sampleBackground, oklchCss(palette[SWATCH_KEY[option]])),
                  ),
                ],
                [],
              ),
              title,
            ],
          ),
        ),
      ),
      h.div(
        [...css(sliders)],
        CHANNELS.map(([channel, title]) => {
          const { min, max, step } = CHANNEL_RANGE[channel]
          const value = selected[CHANNEL_KEY[channel]]
          return h.label(
            [...css(slider)],
            [
              h.span([], [title]),
              h.input([
                h.Type('range'),
                h.Min(String(min)),
                h.Max(String(max)),
                h.Step(String(step)),
                h.Value(String(value)),
                h.OnInput(raw => Message.ChangedChannel({ channel, value: Number(raw) })),
                ...css(range),
              ]),
              h.span([...css(sliderValue)], [formatChannel(channel, value)]),
            ],
          )
        }),
      ),
      h.span(
        [...css(cssValue)],
        [
          selectedCss,
          isInSrgb(selectedCss)
            ? ''
            : ' is outside sRGB. Both metrics score the color the CSS gamut-mapping algorithm maps it to.',
        ],
      ),
    ],
  )
}

const resultsView = (palette: Palette, h: HtmlBuilder<Message>): Html => {
  const theme = paletteTheme(palette)
  const apcaResults = check(theme, DEMO_PAIRS, apca)
  const wcagResults = check(theme, DEMO_PAIRS, wcag2)
  return h.div(
    [h.AriaLive('polite'), ...css(column)],
    [
      h.span([...css(label)], ['Every pair, scored as you edit']),
      h.div(
        [],
        apcaResults.map((result, index) => {
          const wcag = wcagResults[index] ?? result
          return h.div(
            [...css(resultRow)],
            [
              sample(h, result.text, result.background),
              h.span(
                [],
                [
                  h.span([...css(resultName)], [result.pair.name]),
                  h.span(
                    [...css(Design.muted, Design.small)],
                    [
                      ` · ${USE_CASE_LABEL[result.pair.useCase]}, ${targetText(apca, result.pair.useCase)} or ${targetText(wcag2, result.pair.useCase)}`,
                    ],
                  ),
                ],
              ),
              h.span(
                [...css(resultScores)],
                [
                  h.span([], ['APCA ', scoreView(h, apca, result.score, result.verdict)]),
                  h.span([], ['WCAG 2 ', scoreView(h, wcag2, wcag.score, wcag.verdict)]),
                ],
              ),
            ],
          )
        }),
      ),
      decodeView(palette, h),
    ],
  )
}

const decodeView = (palette: Palette, h: HtmlBuilder<Message>): Html => {
  const exit = Effect.runSyncExit(decodeDemoTheme(paletteValues(palette)))
  const isAccepted = Exit.isSuccess(exit)
  return h.div(
    [...css(decodeBox({ isAccepted }))],
    [
      h.span(
        [...css(label)],
        [
          isAccepted
            ? 'decodeTheme accepts these values'
            : 'decodeTheme rejects these values',
        ],
      ),
      h.pre(
        [...css(decodeText)],
        [
          Exit.match(exit, {
            onSuccess: () => JSON.stringify(paletteValues(palette).color, null, 2),
            onFailure: cause => {
              const error = Cause.squash(cause)
              return error instanceof Error ? error.message : String(error)
            },
          }),
        ],
      ),
    ],
  )
}

const workbenchView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [...css(workbench)],
    [editorView(model, h), resultsView(model.contrast.palette, h)],
  )

// LINKS

const MYNDEX_URL = 'https://github.com/Myndex/SAPC-APCA'
const ARTICLE_URL = 'https://ruitina.com/apca-accessible-colour-contrast/'
const COLORJS_URL = 'https://colorjs.io'
const WCAG3_URL = 'https://www.w3.org/TR/wcag-3.0/'

// VIEW

export const contrastView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.article(
    [...css(articleStyle)],
    [
      pageIntro(
        h,
        'Contrast',
        'Check contrast before anyone reads it',
        'Contrast belongs to a theme, not to a page. Say which tokens are drawn on which, give each pair a target, and check every pair in every theme: in a test, and whenever a theme arrives from outside the program.',
      ),
      section(h, 'apca', 'Two ways to measure', [
        paragraph(
          h,
          'The WCAG 2 contrast ratio compares the luminance of two colors. It gives the same answer whichever color is the text, and it ignores how large and heavy the text is. It also overstates the contrast of dark colors, so dark themes pass that readers find dim.',
        ),
        paragraph(
          h,
          `APCA, the Accessible Perceptual Contrast Algorithm by Andrew Somers of [Myndex](${MYNDEX_URL}), models how bright text reads against its background. It reports a lightness contrast, Lc: positive for dark text on a light background, negative for light on dark. Its targets depend on what the text is for. Juan Ruitiña’s [introduction](${ARTICLE_URL}) is a good place to start.`,
        ),
        paragraph(
          h,
          `This page uses APCA 0.0.98G, computed with [Color.js](${COLORJS_URL}). APCA is still evolving and its levels are guidance, not a standard. It isn’t part of WCAG: the [current WCAG 3 draft](${WCAG3_URL}) leaves the contrast method to be determined. So every check here can use either metric, and the site’s default is one line.`,
        ),
      ]),
      h.div([...css(wide)], [targetsTable(h)]),
      section(h, 'orange', 'The orange button', [
        paragraph(
          h,
          'The two metrics disagree most on saturated mid-tones. On #ff6600, WCAG 2 prefers black text by a wide margin, and white fails even the 3:1 large-text minimum. APCA scores white higher, which matches what readers report.',
        ),
      ]),
      h.div([...css(wide)], [orangeView(h)]),
      section(h, 'pairs', 'Declare the pairs', [
        paragraph(
          h,
          'A pair names a text token, the background token it’s drawn on, and a use case. `check` looks each token up with `Theme.resolve`, which follows aliases across nested scopes the way CSS does, maps the colors into sRGB, and scores them. Colors in `oklch(...)` or any other CSS color syntax work.',
        ),
        codeBlock(h, pairsSource, 'contrast.ts'),
        paragraph(
          h,
          'The checker only needs tokens and themes, so it works with whatever token layers a design system has. The [theming page](/theming)’s design system lists its pairs in `contrastPairs`, and a test checks them in both brands and all three modes, with a brand’s palette and a mode’s aliases as two scopes. The checker sits beside Pleat rather than inside it: the metric is a value you pass, and the default lives in the site’s code.',
        ),
      ]),
      section(h, 'site', 'This site’s themes', [
        paragraph(
          h,
          'Here is every pair this site declares, checked in both themes when the page is built. A unit test runs the same check, so a palette change that breaks a pair fails in CI. When a failure is accepted for now, the test lists it, and fixing it means taking it off the list.',
        ),
        paragraph(h, siteSummary()),
      ]),
      h.div(
        [...css(wide)],
        SITE_THEMES.map(([name, theme]) => siteTable(h, name, SITE_PAIRS, theme)),
      ),
      section(h, 'try', 'Try it', [
        paragraph(
          h,
          'Pick a color and move its sliders. Each pair is scored by both metrics as you edit, and the palette is decoded as a theme at the same time. The orange palette starts with black on the button, as WCAG 2 would choose. Set on accent’s lightness to 100% and compare.',
        ),
      ]),
      h.div([], [workbenchView(model, h)]),
      section(h, 'decode', 'Reject a theme that fails', [
        paragraph(
          h,
          '`Theme.decode` already rejects a theme from outside the program, such as a language model’s structured output, when a value isn’t a valid color or length. Contrast is one more check on the same Schema, so a palette with unreadable text fails the same way, with the failure at the token that caused it.',
        ),
        codeBlock(h, decodeSource, 'decode.ts'),
      ]),
      section(h, 'test', 'Keep it checked', [
        paragraph(
          h,
          'A unit test runs the same check on your real themes, so a palette change that breaks a pair fails in CI rather than in front of a reader.',
        ),
        codeBlock(h, testSource, 'contrast.test.ts'),
      ]),
      section(h, 'limits', 'What it doesn’t check', [
        bullets(h, [
          'Translucent colors and values the browser resolves later, like `color-mix()` and relative colors, score as Unknown, which fails. Their contrast depends on what is behind them.',
          'Colors outside sRGB are mapped into it with the CSS gamut-mapping algorithm first. On a wide-gamut display the browser may show more saturated colors than were scored.',
          'Use cases stand in for APCA’s font size and weight tables. Body text set small or thin needs more than the use case asks for.',
          'A passing score isn’t proof of readability. Contrast is one input, next to type size, spacing, and testing with readers.',
        ]),
      ]),
    ],
  )
