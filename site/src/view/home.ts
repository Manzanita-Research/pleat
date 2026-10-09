import type { Html, HtmlBuilder } from 'foldkit/html'

import { Color, Recipe, Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'

import { codeBlock } from '../code.ts'
import * as Design from '../design.ts'
import { Message, type Model, type Size, type Tone } from '../message.ts'
import { algebraRouter, generativeRouter, guideRouter } from '../route.ts'
import quickstartSource from '../snippet/quickstart.ts?raw'
import transformsSource from '../snippet/transforms.ts?raw'
import { paragraph, rich } from './prose.ts'

const { color, font, radius, space, text } = Design.tokens

// STYLES

const wide = When.minWidth('60rem')

const section = Style.merge(
  Design.container,
  Style.make({ paddingBlock: space[8] }),
).pipe(Style.when(wide, { paddingBlock: space[9] }))

const heroSection = Style.merge(
  Design.container,
  Style.make({
    display: 'grid',
    gap: space[7],
    alignItems: 'center',
    paddingBlockStart: space[8],
    paddingBlockEnd: space[7],
  }),
).pipe(
  Style.when(wide, {
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
    gap: space[8],
    paddingBlockStart: space[8],
  }),
)

const heroCopy = Style.make({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: space[5],
})

const pill = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  paddingBlock: space[1],
  paddingInlineStart: space[2],
  paddingInlineEnd: space[3],
  borderRadius: 999,
  border: `1px solid ${color.line}`,
  backgroundColor: color.surface,
  fontSize: text.xs,
  fontWeight: 500,
  color: color.muted,
})

const pillDot = Style.make({
  width: 7,
  height: 7,
  borderRadius: 999,
  backgroundColor: color.green,
  boxShadow: `0 0 0 3px ${Color.alpha(color.green, 0.18)}`,
})

const install = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[3],
  maxWidth: '100%',
  overflowX: 'auto',
  paddingBlock: space[2],
  paddingInline: space[4],
  borderRadius: radius.md,
  backgroundColor: color.sunken,
  border: `1px solid ${color.line}`,
  fontFamily: font.mono,
  fontSize: text.sm,
  whiteSpace: 'nowrap',
}).pipe(
  Style.when(When.before, {
    content: '"$"',
    color: color.muted,
  }),
)

// NOTE: the hero specimen compiles a real style and shows what Pleat made of
// it, so the page can't drift from the library.
const specimenStyle = Style.make({
  display: 'grid',
  gap: 12,
  padding: 20,
  borderRadius: 12,
}).pipe(
  Style.when(When.hover, { translate: '0 -2px' }),
  Style.when(When.minWidth('40rem'), { padding: 28 }),
)

const SPECIMEN_SOURCE = `const card = Style.make({
  display: 'grid', gap: 12, padding: 20, borderRadius: 12,
}).pipe(
  Style.when(When.hover, { translate: '0 -2px' }),
  Style.when(When.minWidth('40rem'), { padding: 28 }),
)`

const specimen = Style.merge(
  Design.card,
  Style.make({
    padding: 0,
    overflow: 'hidden',
    boxShadow: Design.tokens.shadow.overlay,
  }),
)

const specimenStage = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
  padding: space[4],
  borderTop: `1px solid ${color.line}`,
}).pipe(Style.when(When.firstChild, { borderTop: 'none' }))

const stageLabel = Style.make({
  display: 'flex',
  alignItems: 'center',
  gap: space[2],
  fontFamily: font.mono,
  fontSize: '0.75rem',
  color: color.muted,
})

const stageNumber = Style.make({
  display: 'inline-grid',
  placeItems: 'center',
  width: 18,
  height: 18,
  borderRadius: 999,
  backgroundColor: color.accent,
  color: color.onAccent,
  fontSize: '0.6875rem',
  fontWeight: 600,
})

const specimenCode = Style.make({
  margin: 0,
  fontFamily: font.mono,
  fontSize: '0.75rem',
  lineHeight: 1.65,
  whiteSpace: 'pre',
  overflowX: 'auto',
})

const scroller = Style.make({ overflowX: 'auto' })

const atomTable = Style.make({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: font.mono,
  fontSize: '0.75rem',
})

const atomCell = Style.make({
  textAlign: 'start',
  paddingBlock: 3,
  paddingInlineEnd: space[3],
  borderBottom: `1px dashed ${color.line}`,
  whiteSpace: 'nowrap',
})

const conditionCell = Style.merge(atomCell, Style.make({ color: color.indigo }))

const classOutput = Style.make({
  margin: 0,
  fontFamily: font.mono,
  fontSize: '0.75rem',
  lineHeight: 1.6,
  overflowWrap: 'anywhere',
  color: color.ink,
})

const classValue = Style.make({ color: color.green })

const bandSection = Style.merge(
  Design.container,
  Style.make({ paddingBlockEnd: space[7] }),
)

const stats = Style.make({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 1,
  margin: 0,
  backgroundColor: color.line,
  borderBlock: `1px solid ${color.line}`,
}).pipe(Style.when(wide, { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }))

const stat = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[2],
  paddingBlock: space[5],
  paddingInline: space[4],
  backgroundColor: color.canvas,
}).pipe(Style.when(wide, { paddingBlock: space[6], paddingInline: space[5] }))

const statFigure = Style.make({
  fontFamily: font.serif,
  fontSize: 'clamp(2.25rem, 4vw, 3rem)',
  lineHeight: 1,
  letterSpacing: '-0.02em',
})

const statText = Style.make({ fontSize: text.sm, color: color.muted, textWrap: 'pretty' })

const sectionHeader = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[4],
  maxWidth: '44rem',
  marginBlockEnd: space[7],
})

const split = Style.make({ display: 'grid', gap: space[7], alignItems: 'start' }).pipe(
  Style.when(wide, {
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
    gap: space[8],
  }),
)

const steps = Style.make({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
})

const step = Style.make({
  display: 'grid',
  gridTemplateColumns: '2.5rem minmax(0, 1fr)',
  gap: space[3],
  paddingBlock: space[5],
  borderTop: `1px solid ${color.line}`,
}).pipe(Style.when(When.firstChild, { borderTop: 'none', paddingBlockStart: 0 }))

const stepNumber = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.accent,
  paddingBlockStart: 3,
})

const pillars = Style.make({
  display: 'grid',
  gap: 1,
  backgroundColor: color.line,
  border: `1px solid ${color.line}`,
  borderRadius: radius.lg,
  overflow: 'hidden',
}).pipe(
  Style.when(When.minWidth('40rem'), {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
  Style.when(When.minWidth('68rem'), {
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  }),
)

const pillar = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
  padding: space[5],
  backgroundColor: color.surface,
}).pipe(Style.when(When.minWidth('48rem'), { padding: space[6] }))

const pillarNumber = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.accent,
})

const pillarTitle = Style.make({
  fontFamily: font.serif,
  fontSize: '1.75rem',
  fontWeight: 400,
  lineHeight: 1.1,
})

const playground = Style.merge(
  Design.card,
  Style.make({ display: 'grid', padding: 0, overflow: 'hidden' }),
).pipe(Style.when(wide, { gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }))

const controls = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[4],
  padding: space[5],
})

const control = Style.make({ display: 'flex', flexDirection: 'column', gap: space[2] })

const controlLabel = Style.make({
  fontSize: '0.75rem',
  fontFamily: font.mono,
  color: color.muted,
})

const stage = Style.make({
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  minHeight: 240,
  padding: space[6],
  backgroundColor: color.canvas,
  backgroundImage: `radial-gradient(${Color.alpha(color.muted, 0.35)} 1px, transparent 1px)`,
  backgroundSize: '14px 14px',
  borderTop: `1px solid ${color.line}`,
}).pipe(
  Style.when(wide, { borderTop: 'none', borderInlineStart: `1px solid ${color.line}` }),
)

const stageCaption = Style.merge(
  controlLabel,
  Style.make({ position: 'absolute', top: space[3], insetInlineStart: space[4] }),
)

const output = Style.make({
  gridColumn: '1 / -1',
  display: 'grid',
  gap: space[5],
  padding: space[5],
  borderTop: `1px solid ${color.line}`,
  backgroundColor: color.sunken,
}).pipe(Style.when(wide, { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }))

const mono = Style.make({
  fontFamily: font.mono,
  fontSize: '0.75rem',
  lineHeight: 1.7,
  overflowWrap: 'anywhere',
  margin: 0,
  whiteSpace: 'pre-wrap',
  color: color.ink,
})

const schemaFrame = Style.merge(
  mono,
  Style.make({
    maxHeight: 340,
    overflowY: 'auto',
    padding: space[3],
    border: `1px solid ${color.line}`,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  }),
)

const tableFrame = Style.make({
  maxHeight: 280,
  overflowY: 'auto',
  border: `1px solid ${color.line}`,
  borderRadius: radius.md,
  backgroundColor: color.surface,
  paddingInline: space[3],
})

const declarationTable = Style.make({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: font.mono,
  fontSize: '0.75rem',
})

const cell = Style.make({
  textAlign: 'start',
  paddingBlock: space[1],
  paddingInlineEnd: space[3],
  borderBottom: `1px solid ${color.line}`,
  verticalAlign: 'top',
})

const headCell = Style.merge(
  cell,
  Style.make({
    color: color.muted,
    fontWeight: 500,
    position: 'sticky',
    top: 0,
    backgroundColor: color.surface,
  }),
)

const closing = Style.merge(
  Design.card,
  Style.make({
    position: 'relative',
    display: 'grid',
    gap: space[6],
    padding: space[6],
    overflow: 'hidden',
  }),
).pipe(
  Style.when(wide, {
    gridTemplateColumns: 'minmax(0, 1.4fr) auto',
    alignItems: 'end',
    padding: space[7],
  }),
)

const transformsSection = Style.merge(section, Style.make({ paddingBlockStart: 0 }))

const closingSection = Style.merge(
  Design.container,
  Style.make({ paddingBlockEnd: space[9] }),
)

const closingStripe = Style.merge(
  Design.pleatBand,
  Style.make({
    position: 'absolute',
    insetInline: 0,
    top: 0,
    height: 6,
    borderRadius: 0,
    boxShadow: 'none',
  }),
)

// VIEW

const TONES: ReadonlyArray<Tone> = ['Primary', 'Neutral', 'Quiet']
const SIZES: ReadonlyArray<Size> = ['Small', 'Medium', 'Large']

const segmented = <Option extends string>(
  h: HtmlBuilder<Message>,
  label: string,
  options: ReadonlyArray<Option>,
  selected: Option,
  toMessage: (option: Option) => Message,
): Html =>
  h.div(
    [...css(control)],
    [
      h.span([...css(controlLabel)], [label]),
      h.div(
        [h.Role('group'), h.AriaLabel(label), ...css(Design.segment)],
        options.map(option =>
          h.button(
            [
              h.Type('button'),
              h.AriaPressed(option === selected ? 'true' : 'false'),
              h.OnClick(toMessage(option)),
              ...css(Design.segmentButton),
            ],
            [option],
          ),
        ),
      ),
    ],
  )

const buttonSchemaDocument = Recipe.jsonSchema(Design.button)
const buttonSchema = JSON.stringify(
  buttonSchemaDocument.definitions['Button'] ?? buttonSchemaDocument.schema,
  null,
  2,
)

const specimenView = (h: HtmlBuilder<Message>): Html =>
  h.figure(
    [h.AriaLabel('What Pleat compiles a style to'), ...css(specimen)],
    [
      h.div(
        [...css(specimenStage)],
        [
          h.span(
            [...css(stageLabel)],
            [h.span([...css(stageNumber)], ['1']), 'You write a value'],
          ),
          h.pre([...css(specimenCode)], [SPECIMEN_SOURCE]),
        ],
      ),
      h.div(
        [...css(specimenStage)],
        [
          h.span(
            [...css(stageLabel)],
            [
              h.span([...css(stageNumber)], ['2']),
              'Pleat compiles atoms when the module loads',
            ],
          ),
          h.div(
            [...css(scroller)],
            [
              h.table(
                [...css(atomTable)],
                [
                  h.tbody(
                    [],
                    Style.declarations(specimenStyle).map(entry =>
                      h.tr(
                        [],
                        [
                          h.td([...css(conditionCell)], [entry.condition]),
                          h.td([...css(atomCell)], [entry.property]),
                          h.td([...css(atomCell)], [entry.value]),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [...css(specimenStage)],
        [
          h.span(
            [...css(stageLabel)],
            [
              h.span([...css(stageNumber)], ['3']),
              'The view gets one finished attribute',
            ],
          ),
          h.p(
            [...css(classOutput)],
            [
              'css(card) → class="',
              h.span([...css(classValue)], [specimenStyle.className]),
              '"',
            ],
          ),
        ],
      ),
    ],
  )

const playgroundView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { tone, size, isPending } = model.playground
  const style = Design.button({ tone, size, isPending })
  return h.div(
    [...css(playground)],
    [
      h.div(
        [...css(controls)],
        [
          segmented(h, 'tone', TONES, tone, option =>
            Message.SelectedTone({ tone: option }),
          ),
          segmented(h, 'size', SIZES, size, option =>
            Message.SelectedSize({ size: option }),
          ),
          segmented(
            h,
            'isPending',
            ['false', 'true'],
            isPending ? 'true' : 'false',
            option => Message.UpdatedPending({ isPending: option === 'true' }),
          ),
        ],
      ),
      h.div(
        [...css(stage)],
        [
          h.span([...css(stageCaption)], ['Live']),
          h.button(
            [h.Type('button'), ...css(style)],
            [isPending ? 'Saving…' : 'Save changes'],
          ),
        ],
      ),
      h.div(
        [...css(output)],
        [
          h.div(
            [...css(Design.stack(space[2]))],
            [
              h.span(
                [...css(controlLabel)],
                [`button(${JSON.stringify({ tone, size, isPending })})`],
              ),
              h.p([...css(mono)], [`class="${style.className}"`]),
              h.div(
                [...css(tableFrame)],
                [
                  h.table(
                    [...css(declarationTable)],
                    [
                      h.thead(
                        [],
                        [
                          h.tr(
                            [],
                            ['condition', 'property', 'value'].map(label =>
                              h.th([...css(headCell)], [label]),
                            ),
                          ),
                        ],
                      ),
                      h.tbody(
                        [],
                        Style.declarations(style).map(entry =>
                          h.tr(
                            [],
                            [entry.condition, entry.property, entry.value].map(value =>
                              h.td([...css(cell)], [value]),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [...css(Design.stack(space[2]))],
            [
              h.span([...css(controlLabel)], ['Recipe.jsonSchema(button)']),
              h.pre([...css(schemaFrame)], [buttonSchema]),
            ],
          ),
        ],
      ),
    ],
  )
}

const STATS: ReadonlyArray<readonly [figure: string, body: string]> = [
  ['90 ns', 'to resolve a recipe to its class names. cva takes 228 ns.'],
  ['0', 'rules created during render. Every rule exists once its module loads.'],
  ['1 class', 'per declaration, shared by every style that uses it.'],
  ['4 laws', 'checked by property tests, and in Chromium against the real cascade.'],
]

const STEPS: ReadonlyArray<readonly [title: string, body: string]> = [
  [
    'Define',
    '`Style.make` turns declarations into atoms: one condition, one property, one value, one class. `card` and every `badge` option exist as rules the moment this module loads.',
  ],
  [
    'Choose',
    'In the view, `badge({ status })` picks a finished style with a few map lookups, and `css()` hands Foldkit one `Class` attribute it has already built. Nothing about CSS happens during render.',
  ],
  [
    'Ship',
    'On the server, `renderDocument` puts the rules a page uses in its `<head>`. The client computes the same class names, so hydration matches.',
  ],
]

const PILLARS: ReadonlyArray<readonly [title: string, body: string]> = [
  [
    'Lawful',
    'Merging is associative, has an identity, and changes nothing when repeated. Property tests check the laws, and a Chromium test checks the cascade agrees with them.',
  ],
  [
    'Built for Foldkit',
    'One `css()` spread per element. Conditions match `@foldkit/ui` states like `data-open` and `data-disabled`. Variant props are Schemas, like your Model.',
  ],
  [
    'Fast on both sides',
    'Every rule exists before the first render. A recipe resolves in about 90 ns. Each server-rendered page ships only the CSS it uses.',
  ],
  [
    'Safe to generate',
    'Recipes and themes export JSON Schema. A model chooses among styles that are already compiled, so it never writes CSS.',
  ],
]

const sectionHeaderView = (
  h: HtmlBuilder<Message>,
  eyebrow: string,
  title: string,
  body: ReadonlyArray<string>,
): Html =>
  h.div(
    [...css(sectionHeader)],
    [
      h.span([...css(Design.eyebrow)], [eyebrow]),
      h.h2([...css(Design.heading)], [title]),
      ...body.map(text => paragraph(h, text)),
    ],
  )

export const homeView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.section(
        [...css(heroSection)],
        [
          h.div(
            [...css(heroCopy)],
            [
              h.span(
                [...css(pill)],
                [h.span([...css(pillDot)]), 'v0.1 for Foldkit and Effect v4'],
              ),
              h.h1(
                [...css(Design.hero)],
                [
                  'Styles are ',
                  h.em([...css(Design.flourish)], ['values.']),
                  ' Pleat folds them.',
                ],
              ),
              h.p(
                [...css(Design.lede)],
                [
                  'Merge, nest, and vary styles by Model, with laws that hold. Pleat compiles every rule to atomic CSS before the first render, so your views only choose among them.',
                ],
              ),
              h.div(
                [...css(Design.row(space[3]))],
                [
                  h.a(
                    [
                      h.Href(guideRouter()),
                      ...css(Design.button({ tone: 'Primary', size: 'Large' })),
                    ],
                    ['Read the guide'],
                  ),
                  h.a(
                    [h.Href(algebraRouter()), ...css(Design.button({ size: 'Large' }))],
                    ['See the algebra'],
                  ),
                ],
              ),
              h.code([...css(install)], ['pnpm add @pleat/core @pleat/foldkit']),
            ],
          ),
          specimenView(h),
        ],
      ),
      h.div(
        [...css(bandSection)],
        [h.div([h.AriaHidden(true), ...css(Design.pleatBand)])],
      ),
      h.section(
        [h.AriaLabel('At a glance'), ...css(Design.container)],
        [
          h.dl(
            [...css(stats)],
            STATS.map(([figure, body]) =>
              h.div(
                [...css(stat)],
                [h.dt([...css(statFigure)], [figure]), h.dd([...css(statText)], [body])],
              ),
            ),
          ),
        ],
      ),
      h.section(
        [...css(section)],
        [
          sectionHeaderView(
            h,
            'How it works',
            'A style is data, so everything knows it in advance',
            [],
          ),
          h.div(
            [...css(split)],
            [
              codeBlock(h, quickstartSource, 'post.ts'),
              h.ol(
                [...css(steps)],
                STEPS.map(([title, body], index) =>
                  h.li(
                    [...css(step)],
                    [
                      h.span([...css(stepNumber)], [`0${index + 1}`]),
                      h.div(
                        [...css(Design.stack(space[2]))],
                        [
                          h.h3([...css(Design.subheading)], [title]),
                          h.p([...css(Design.muted)], rich(h, body)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      h.section(
        [...css(Design.container)],
        [
          h.div(
            [...css(pillars)],
            PILLARS.map(([title, body], index) =>
              h.article(
                [...css(pillar)],
                [
                  h.span([...css(pillarNumber)], [`0${index + 1}`]),
                  h.h3([...css(pillarTitle)], [title]),
                  h.p([...css(Design.muted)], rich(h, body)),
                ],
              ),
            ),
          ),
        ],
      ),
      h.section(
        [h.Id('playground'), ...css(section)],
        [
          sectionHeaderView(h, 'Playground', 'Try a recipe', [
            'This is the button this site uses. Each choice below is a Message; the view calls `button(props)` and gets back a style that was compiled when the page loaded. The JSON Schema is what a model would see.',
          ]),
          playgroundView(model, h),
        ],
      ),
      h.section(
        [...css(transformsSection)],
        [
          h.div(
            [...css(split)],
            [
              h.div(
                [...css(Design.stack(space[4]))],
                [
                  h.span([...css(Design.eyebrow)], ['Transforms']),
                  h.h2(
                    [...css(Design.heading)],
                    ['Change styles with functions, not overrides'],
                  ),
                  paragraph(
                    h,
                    'A transform is a function from style to style. `Style.evolve` maps values where they are declared, and `Calc` and `Color` return CSS functions over your tokens, so a transform written once holds under every theme.',
                  ),
                  paragraph(
                    h,
                    'Recipes take finished styles as branches. Props pick a branch; they never build one. So every rule a recipe can produce is known when its module loads, which is what makes extraction, server rendering, and generated interfaces possible. The [algebra page](/algebra) has the details.',
                  ),
                ],
              ),
              codeBlock(h, transformsSource, 'button.ts'),
            ],
          ),
        ],
      ),
      h.section(
        [...css(closingSection)],
        [
          h.div(
            [...css(closing)],
            [
              h.div([h.AriaHidden(true), ...css(closingStripe)]),
              h.div(
                [...css(Design.stack(space[4]))],
                [
                  h.span([...css(Design.eyebrow)], ['The FACE stack']),
                  h.h2(
                    [...css(Design.heading)],
                    ['Foldkit, Alchemy, Cloudflare, Effect'],
                  ),
                  paragraph(
                    h,
                    'Pleat is meant to be the default styling layer for FACE apps. This site is one: a Foldkit app rendered to static pages, styled only with Pleat, and deployed to Cloudflare by an Alchemy stack.',
                  ),
                ],
              ),
              h.div(
                [...css(Design.row(space[3]))],
                [
                  h.a(
                    [
                      h.Href(guideRouter()),
                      ...css(Design.button({ tone: 'Primary', size: 'Large' })),
                    ],
                    ['Start the guide'],
                  ),
                  h.a(
                    [
                      h.Href(generativeRouter()),
                      ...css(Design.button({ tone: 'Quiet', size: 'Large' })),
                    ],
                    ['Generative interfaces →'],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
