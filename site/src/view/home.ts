import { Recipe, Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { codeBlock } from '../code.ts'
import * as Design from '../design.ts'
import { Message, type Model, type Size, type Tone } from '../message.ts'
import { algebraRouter, generativeRouter, guideRouter } from '../route.ts'
import furtherSource from '../snippet/further.ts?raw'
import quickstartSource from '../snippet/quickstart.ts?raw'
import { paragraph, rich } from './prose.ts'

const { color, font, radius, space, text } = Design.tokens

const FURTHER_2017 = `// Further, 2017: a style was a function of props.
const MyButtonStyle = GenericButtonStyle
  .map(bumpFontSize)
  .map(darkenText)
  .map(brandify)
  .concat(boxShadow)
  .chain(outlineify)

<View style={MyButtonStyle.resolve(props)} />`

// STYLES

const wide = When.minWidth('56rem')

const hero = Style.merge(
  Design.container,
  Style.make({ display: 'flex', flexDirection: 'column', gap: space[6] }),
)

const heroCopy = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[5],
  maxWidth: '52rem',
})

const install = Style.make({
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[3],
  paddingBlock: space[3],
  paddingInline: space[4],
  borderRadius: radius.md,
  border: `1px dashed ${color.line}`,
  fontFamily: font.mono,
  fontSize: text.sm,
  color: color.muted,
})

const band = Style.make({ display: 'flex', flexDirection: 'column', gap: space[8] })

const split = Style.make({ display: 'grid', gap: space[6], alignItems: 'start' }).pipe(
  Style.when(wide, {
    gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
    gap: space[7],
  }),
)

const pillars = Style.make({ display: 'grid', gap: space[4] }).pipe(
  Style.when(When.minWidth('40rem'), {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
  Style.when(When.minWidth('64rem'), {
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  }),
)

const pillar = Style.merge(
  Design.card,
  Style.make({ display: 'flex', flexDirection: 'column', gap: space[3] }),
)

const pillarNumber = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.accent,
})

const playground = Style.merge(
  Design.card,
  Style.make({ display: 'grid', gap: space[5], padding: 0, overflow: 'hidden' }),
).pipe(Style.when(wide, { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 0 }))

const controls = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[4],
  padding: space[5],
})

const control = Style.make({ display: 'flex', flexDirection: 'column', gap: space[2] })

const controlLabel = Style.make({
  fontSize: text.xs,
  fontFamily: font.mono,
  color: color.muted,
})

const stage = Style.make({
  display: 'grid',
  placeItems: 'center',
  minHeight: 220,
  padding: space[6],
  backgroundColor: color.canvas,
  backgroundImage: `radial-gradient(${color.line} 1px, transparent 1px)`,
  backgroundSize: '16px 16px',
  borderTop: `1px solid ${color.line}`,
}).pipe(
  Style.when(wide, { borderTop: 'none', borderInlineStart: `1px solid ${color.line}` }),
)

const output = Style.make({
  gridColumn: '1 / -1',
  display: 'grid',
  gap: space[4],
  padding: space[5],
  borderTop: `1px solid ${color.line}`,
}).pipe(Style.when(wide, { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }))

const mono = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  lineHeight: 1.7,
  overflowWrap: 'anywhere',
  margin: 0,
  whiteSpace: 'pre-wrap',
  color: color.ink,
})

const tableFrame = Style.make({
  maxHeight: 340,
  overflowY: 'auto',
  border: `1px solid ${color.line}`,
  borderRadius: radius.md,
  paddingInline: space[3],
})

const declarationTable = Style.make({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: font.mono,
  fontSize: text.xs,
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

const lineage = Style.make({ display: 'grid', gap: space[4] }).pipe(
  Style.when(wide, { gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.2fr)' }),
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
            Message.PickedTone({ tone: option }),
          ),
          segmented(h, 'size', SIZES, size, option =>
            Message.PickedSize({ size: option }),
          ),
          segmented(
            h,
            'isPending',
            ['false', 'true'],
            isPending ? 'true' : 'false',
            option => Message.PickedPending({ isPending: option === 'true' }),
          ),
        ],
      ),
      h.div(
        [...css(stage)],
        [
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
              h.pre([...css(mono)], [buttonSchema]),
            ],
          ),
        ],
      ),
    ],
  )
}

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

export const homeView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [...css(band)],
    [
      h.section(
        [...css(hero)],
        [
          h.div(
            [...css(heroCopy)],
            [
              h.span(
                [...css(Design.eyebrow)],
                ['Algebraic styles for Foldkit and Effect v4'],
              ),
              h.h1([...css(Design.display)], ['Styles are values. Pleat folds them.']),
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
          h.div([h.AriaHidden(true), ...css(Design.pleatBand)]),
        ],
      ),
      h.section(
        [...css(Design.container)],
        [
          h.div(
            [...css(split)],
            [
              codeBlock(h, quickstartSource, 'post.ts'),
              h.div(
                [...css(Design.stack(space[4]))],
                [
                  h.h2(
                    [...css(Design.heading)],
                    ['A style is data, so everything knows it in advance'],
                  ),
                  paragraph(
                    h,
                    '`Style.make` turns declarations into atoms: one condition, one property, one value, one class. `card` and every `badge` option exist as rules the moment this module loads.',
                  ),
                  paragraph(
                    h,
                    'In the view, `badge({ status })` picks a finished style with a few map lookups, and `css()` hands Foldkit one `Class` attribute it has already built. Nothing about CSS happens during render.',
                  ),
                  paragraph(
                    h,
                    'On the server, `renderDocument` puts the rules a page uses in its `<head>`. The client computes the same class names, so hydration matches.',
                  ),
                ],
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
                  h.h3([...css(Design.subheading)], [title]),
                  h.p([...css(Design.muted)], rich(h, body)),
                ],
              ),
            ),
          ),
        ],
      ),
      h.section(
        [h.Id('playground'), ...css(Design.container)],
        [
          h.div(
            [...css(Design.stack(space[5]))],
            [
              h.div(
                [...css(Design.prose)],
                [
                  h.h2([...css(Design.heading)], ['Try a recipe']),
                  paragraph(
                    h,
                    'This is the button this site uses. Each choice below is a Message; the view calls `button(props)` and gets back a style that was compiled when the page loaded. The JSON Schema on the right is what a model would see.',
                  ),
                ],
              ),
              playgroundView(model, h),
            ],
          ),
        ],
      ),
      h.section(
        [...css(Design.container)],
        [
          h.div(
            [...css(Design.stack(space[5]))],
            [
              h.div(
                [...css(Design.prose)],
                [
                  h.span([...css(Design.eyebrow)], ['Further, 2017 → Pleat, 2026']),
                  h.h2(
                    [...css(Design.heading)],
                    ['The idea was right. The monad was too strong.'],
                  ),
                  paragraph(
                    h,
                    'Pleat started as **Further**, a 2017 library where a style was a function of props, composed with Fantasy Land `map`, `concat`, and `chain`. Composing styles as values was the right idea. But `chain` let a style depend on props in ways nothing could see until render, so the CSS could only exist as inline styles.',
                  ),
                  paragraph(
                    h,
                    'Pleat keeps the values and the transforms, and swaps the monad for structure that can be inspected ahead of time: a monoid for merging, and selective choice among finished branches for props. That one change is what makes extraction, server rendering, and generated interfaces possible. The [algebra page](/algebra) has the details.',
                  ),
                ],
              ),
              h.div(
                [...css(lineage)],
                [
                  codeBlock(h, FURTHER_2017, 'further.js (2017)'),
                  codeBlock(h, furtherSource, 'button.ts (Pleat)'),
                ],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [...css(Design.container)],
        [
          h.div(
            [...css(Design.card)],
            [
              h.div(
                [...css(Design.stack(space[3]))],
                [
                  h.span([...css(Design.eyebrow)], ['The FACE stack']),
                  h.h2(
                    [...css(Design.heading)],
                    ['Foldkit, Alchemy, Cloudflare, Effect'],
                  ),
                  paragraph(
                    h,
                    'Pleat is meant to be the default styling layer for FACE apps. This site is one: a Foldkit app rendered to static pages, styled only with Pleat, and deployed to Cloudflare by an Alchemy stack. Building something generative? Start with [generative interfaces](' +
                      generativeRouter() +
                      ').',
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
