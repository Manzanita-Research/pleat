import type { Html, HtmlBuilder } from 'foldkit/html'

import { Grid, Style } from '@pleat/core'
import { css, gridOverlay } from '@pleat/foldkit'

import { codeBlock } from '../code.ts'
import { bands, frame, grid, note, type } from '../demo/grid.ts'
import gridSource from '../demo/grid.ts?raw'
import * as Design from '../design.ts'
import { Message, type Model } from '../message.ts'
import { articleStyle, pageIntro } from './guide.ts'
import { bullets, paragraph, section } from './prose.ts'

const { color, font, radius, space, text } = Design.tokens

// STYLES

const stage = Style.merge(
  frame.host,
  Style.make({
    borderRadius: radius.md,
    border: `1px solid ${color.line}`,
    backgroundColor: color.surface,
    color: color.ink,
  }),
)

const block = Style.make({
  display: 'flex',
  alignItems: 'flex-start',
  padding: `calc(0.25 * ${grid.unit})`,
  backgroundColor: color.accentSoft,
  color: color.accent,
  overflow: 'hidden',
})

const noteBlock = Style.merge(
  block,
  Style.make({ backgroundColor: color.accent, color: color.onAccent }),
)

const toolbar = Style.make({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space[3],
})

const caption = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.muted,
})

// VIEW

const label = (area: Grid.Area): string => `${area.col}–${area.col + area.span - 1}`

const fieldView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [...css(stage)],
    [
      h.div(
        [...css(frame.field)],
        [
          gridOverlay(grid, h, { isShown: model.isGridShown, of: 6 }),
          ...bands.flatMap(columns =>
            columns.map(({ area, style }) =>
              h.div(
                [...css(block, style)],
                [h.span([...css(type({ role: 'Mono' }))], [label(area)])],
              ),
            ),
          ),
          h.div(
            [...css(noteBlock, note)],
            [
              h.span(
                [...css(type({ role: 'Ui' }))],
                ['Column 3 of 3, and 2 of 2 on the half'],
              ),
            ],
          ),
        ],
      ),
    ],
  )

export const gridView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.article(
    [...css(articleStyle)],
    [
      pageIntro(
        h,
        'The grid',
        'Place things in units, never in pixels',
        'A unit grid is a value, like a theme. A frame fits it to the window with a whole-pixel unit, placements return ordinary styles, and type is measured in the same units.',
      ),
      section(h, 'field', 'One field, every split', [
        paragraph(
          h,
          'The field below is Gerstner’s 58: 58 units with 2-unit gutters, which divide into 2, 3, 4, 5, or 6 equal columns with nothing left over. Each band places every column of one split. Make the window narrower: the unit stays a whole pixel and every edge snaps with it, and below 640px the field drops to its 28-unit half.',
        ),
      ]),
      h.div(
        [...css(toolbar)],
        [
          h.span([...css(caption)], ['Press G, or the button, to show the grid']),
          h.button(
            [
              h.Type('button'),
              h.AriaPressed(model.isGridShown ? 'true' : 'false'),
              h.OnClick(Message.ClickedGridToggle()),
              ...css(Design.button({ size: 'Small', tone: 'Quiet' })),
            ],
            [model.isGridShown ? 'Hide grid' : 'Show grid'],
          ),
        ],
      ),
      fieldView(model, h),
      section(h, 'code', 'The code behind it', [codeBlock(h, gridSource, 'grid.ts')]),
      section(h, 'frames', 'Frames', [
        paragraph(
          h,
          '`Grid.frame` says how a page fits the grid to its window. The unit is the only pixel value: `floor(width / (units + 2 × margin))`, computed once on the field as a registered `<length>`, so every block inherits the same whole number. `Grid.fit` computes the same thing in TypeScript, and a Chromium test checks that the two agree for every block at a dozen widths.',
        ),
        bullets(h, [
          '`Container` fits the unit to the host element, and switches to the half below the half’s width. At 1440px the unit is 24px, at 1728px 28px, at 1920px 32px, and on a 393px phone 13px.',
          '`Viewport` fits it to the viewport instead.',
          '`Fixed` keeps one size, such as 24px for a dense tool. The size can be a token, so a theme layer can set the density without the grid knowing.',
        ]),
      ]),
      section(h, 'placement', 'Placement', [
        bullets(h, [
          '`Grid.column(grid, { of, at, span })` places a block on an exact split. Only the grid’s exact column counts type-check, and only columns that exist in them.',
          '`Grid.place(grid, { col, span, row, rows })` places by units, checked to be whole and inside the field.',
          'On the half, a block fills the width and its rows follow its content, unless its `half` option says where it goes.',
          '`Grid.units(grid, n)` is a length of `n` units, in quarters, for spacing that stays on the grid.',
          '`Grid.type` is a Recipe of type sizes and leadings in units. Leadings are quarter units, so reading text comes back to the grid at least every fourth line.',
        ]),
      ]),
    ],
  )
