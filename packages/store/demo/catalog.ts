import { Paint, Shape, Token } from '@pleat/core'

import { Catalog } from '../src/index.ts'

// A light: four colors and a tone. The store keeps only these.
export const light = Token.make(
  {
    ground: Token.color,
    ink: Token.color,
    dye: Token.color,
    glow: Token.color,
    tone: { lightness: Token.number, chroma: Token.number },
  },
  { prefix: 'light-' },
)

// What pages read. The shape derives it from the light.
export const role = Token.make(
  {
    ground: Token.color,
    ink: Token.color,
    panel: Token.color,
    rule: Token.color,
    muted: Token.color,
    dye: Token.color,
    onDye: Token.color,
    glow: Token.color,
    command: Token.color,
    event: Token.color,
  },
  { prefix: 'role-' },
)

export const look = Shape.make(role, light, ({ ground, ink, dye, glow, tone }) => ({
  ground,
  ink,
  panel: Paint.over(ink, ground, 4),
  rule: Paint.over(ink, ground, 20),
  muted: Paint.fade(ink, ground, 60),
  dye,
  onDye: Paint.mostLegible(dye, [ground, ink]),
  glow,
  command: Paint.oklch(tone.lightness, tone.chroma, 242),
  event: Paint.oklch(tone.lightness, tone.chroma, 48),
}))

export const catalog = Catalog.make({
  'demo-paper': Catalog.theme(light, { shape: look }),
})
