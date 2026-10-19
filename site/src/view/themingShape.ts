import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Paint, Style, Theme, type Token, When } from '@pleat/core'
import { css } from '@pleat/foldkit'

import { lit, role } from '../demo/theming/shape.ts'
import * as Design from '../design.ts'
import { type LightColor, type LightPreset, Message, type Model } from '../message.ts'

const { color, font, radius, space, text } = Design.tokens

// STYLES

const workbench = Style.merge(
  Design.card,
  Style.make({ display: 'grid', gap: space[5], padding: space[5] }),
).pipe(
  Style.when(When.minWidth('60rem'), {
    gridTemplateColumns: 'minmax(14rem, 2fr) minmax(0, 5fr)',
  }),
)

const controls = Style.make({ display: 'grid', alignContent: 'start', gap: space[4] })

const caption = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.muted,
})

const field = Style.make({
  display: 'grid',
  gridTemplateColumns: '2.25rem minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: space[3],
  fontSize: text.sm,
})

const colorInput = Style.make({
  width: '2.25rem',
  height: '2.25rem',
  padding: 0,
  border: `1px solid ${color.line}`,
  borderRadius: radius.sm,
  backgroundColor: 'transparent',
  cursor: 'pointer',
}).pipe(Style.merge(Design.focusRing))

const rangeField = Style.make({ display: 'grid', gap: space[1], fontSize: text.sm })

const rangeLabel = Style.make({ display: 'flex', justifyContent: 'space-between' })

const value = Style.make({ fontFamily: font.mono, fontSize: text.xs, color: color.muted })

const specimen = Style.make({
  display: 'grid',
  alignContent: 'start',
  gap: space[5],
  padding: space[5],
  borderRadius: radius.md,
  backgroundColor: role.ground,
  color: role.ink,
  fontFamily: font.sans,
  fontSize: text.md,
})

const swatchGrid = Style.make({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))',
  gap: space[3],
})

const swatch = Style.make({ display: 'grid', gap: space[1] })

const chip = Style.make({
  height: '2.5rem',
  borderRadius: radius.sm,
  boxShadow: `inset 0 0 0 1px ${role.rule}`,
})

const swatchName = Style.make({ fontSize: text.sm, lineHeight: 1.2 })

const swatchValue = Style.make({
  fontFamily: font.mono,
  fontSize: text.xs,
  color: role.muted,
})

const panel = Style.make({
  display: 'grid',
  gap: space[3],
  padding: space[4],
  borderRadius: radius.sm,
  backgroundColor: role.panel,
  borderTop: `1px solid ${role.rule}`,
})

const logLine = Style.make({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: space[2],
})

const noun = Style.make({ fontFamily: font.mono, fontSize: text.xs })

const mutedText = Style.make({ color: role.muted })

const dyeButton = Style.make({
  justifySelf: 'start',
  paddingBlock: space[2],
  paddingInline: space[4],
  border: 'none',
  borderRadius: radius.sm,
  backgroundColor: role.dye,
  color: role.onDye,
  fontFamily: font.sans,
  fontSize: text.md,
  cursor: 'pointer',
}).pipe(
  Style.when(When.focusVisible, { outline: `2px solid ${role.glow}`, outlineOffset: 2 }),
)

// ROLES

type Role = Readonly<{
  name: string
  token: Token.Token
  on: Token.Token
  chip: Style.Style
}>

const roleOf = (
  name: string,
  token: Token.Token,
  on: Token.Token = role.ground,
): Role => ({
  name,
  token,
  on,
  chip: Style.merge(chip, Style.make({ backgroundColor: token })),
})

const ROLES: ReadonlyArray<Role> = [
  roleOf('ground', role.ground, role.ink),
  roleOf('ink', role.ink),
  roleOf('panel', role.panel, role.ink),
  roleOf('rule', role.rule, role.ink),
  roleOf('muted', role.muted),
  roleOf('dye', role.dye),
  roleOf('onDye', role.onDye, role.dye),
  roleOf('glow', role.glow),
  roleOf('kind.command', role.kind.command),
  roleOf('kind.event', role.kind.event),
  roleOf('kind.rejection', role.kind.rejection),
  roleOf('kind.view', role.kind.view),
]

const KINDS = [
  ['PlaceOrder', Style.make({ color: role.kind.command })],
  ['OrderPlaced', Style.make({ color: role.kind.event })],
  ['OutOfStock', Style.make({ color: role.kind.rejection })],
  ['OpenOrders', Style.make({ color: role.kind.view })],
] as const

const resolved = (theme: Theme.Theme, token: Token.Token): string =>
  Option.getOrElse(Theme.resolve(theme, token), () => '')

// CONTROLS

const COLORS: ReadonlyArray<readonly [LightColor, 'ground' | 'ink' | 'dye' | 'glow']> = [
  ['Ground', 'ground'],
  ['Ink', 'ink'],
  ['Dye', 'dye'],
  ['Glow', 'glow'],
]

const PRESETS: ReadonlyArray<LightPreset> = ['Paper', 'Night']

const presetsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Role('group'), h.AriaLabel('Example lights'), ...css(Design.segment)],
    PRESETS.map(preset =>
      h.button(
        [
          h.Type('button'),
          h.AriaPressed(
            Option.contains(model.theming.lightPreset, preset) ? 'true' : 'false',
          ),
          h.OnClick(Message.ClickedLightPreset({ preset })),
          ...css(Design.segmentButton),
        ],
        [preset],
      ),
    ),
  )

const colorField = (h: HtmlBuilder<Message>, label: LightColor, current: string): Html =>
  h.label(
    [...css(field)],
    [
      h.input([
        h.Type('color'),
        h.Value(current),
        h.OnInput(value => Message.UpdatedLightColor({ color: label, value })),
        ...css(colorInput),
      ]),
      h.span([], [label]),
      h.span([...css(value)], [current]),
    ],
  )

const rangeView = (
  h: HtmlBuilder<Message>,
  label: string,
  current: number,
  bounds: Readonly<{ min: number; max: number; step: number }>,
  toMessage: (value: number) => Message,
): Html =>
  h.label(
    [...css(rangeField)],
    [
      h.span(
        [...css(rangeLabel)],
        [label, h.span([...css(value)], [current.toFixed(2)])],
      ),
      h.input([
        h.Type('range'),
        h.Min(String(bounds.min)),
        h.Max(String(bounds.max)),
        h.Step(String(bounds.step)),
        h.Value(String(current)),
        h.OnInput(raw => toMessage(Number(raw))),
      ]),
    ],
  )

// VIEW

/** Four colors and a tone in, every role of the shape out, bound to one element. */
export const shapeWorkbench = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { light } = model.theming
  const theme = lit(light)
  return h.div(
    [...css(workbench)],
    [
      h.div(
        [...css(controls)],
        [
          h.span(
            [...css(caption)],
            [
              Option.match(model.theming.store, {
                onNone: () => 'A light: four colors and a tone',
                onSome: store => `A light, following ${store.theme} at ${store.url}`,
              }),
            ],
          ),
          presetsView(model, h),
          ...COLORS.map(([label, key]) => colorField(h, label, light[key])),
          rangeView(
            h,
            'Tone lightness',
            light.tone.lightness,
            { min: 0.3, max: 0.9, step: 0.01 },
            lightness => Message.UpdatedToneLightness({ lightness }),
          ),
          rangeView(
            h,
            'Tone chroma',
            light.tone.chroma,
            { min: 0, max: 0.2, step: 0.005 },
            chroma => Message.UpdatedToneChroma({ chroma }),
          ),
        ],
      ),
      h.div(
        [...css(specimen, ...Theme.bindings(theme))],
        [
          h.div(
            [...css(swatchGrid)],
            ROLES.map(entry => {
              const shown = resolved(theme, entry.token)
              const contrast = Paint.contrast(shown, resolved(theme, entry.on))
              return h.div(
                [...css(swatch)],
                [
                  h.span([...css(entry.chip)]),
                  h.span([...css(swatchName)], [entry.name]),
                  h.span(
                    [...css(swatchValue)],
                    [`${shown} · Lc ${Math.round(contrast)}`],
                  ),
                ],
              )
            }),
          ),
          h.div(
            [...css(panel)],
            [
              h.p(
                [...css(logLine)],
                [
                  h.span([...css(noun, KINDS[0][1])], [KINDS[0][0]]),
                  h.span([...css(mutedText)], ['was refused:']),
                  h.span([...css(noun, KINDS[2][1])], [KINDS[2][0]]),
                ],
              ),
              h.p(
                [...css(logLine)],
                [
                  h.span([...css(noun, KINDS[1][1])], [KINDS[1][0]]),
                  h.span([...css(mutedText)], ['updates']),
                  h.span([...css(noun, KINDS[3][1])], [KINDS[3][0]]),
                ],
              ),
              h.button([h.Type('button'), ...css(dyeButton)], ['Retry']),
            ],
          ),
        ],
      ),
    ],
  )
}
