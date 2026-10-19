import { Paint, Shape, type Theme, Token } from '@pleat/core'

// What a light provides: four colors and a tone, a lightness
// and chroma that every kind ink shares.
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

// What components read.
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
    kind: {
      command: Token.color,
      event: Token.color,
      rejection: Token.color,
      view: Token.color,
    },
  },
  { prefix: 'role-' },
)

// The shape: operations, and no colors yet.
export const look = Shape.make(role, light, light => {
  const { ground, ink, dye, glow, tone } = light
  const toned = (hue: number) =>
    Paint.oklch(tone.lightness, tone.chroma, hue)
  return {
    ground,
    ink,
    panel: Paint.over(ink, ground, 4),
    rule: Paint.over(ink, ground, 20),
    muted: Paint.fade(ink, ground, 60),
    dye,
    onDye: Paint.mostLegible(dye, [ground, ink]),
    glow,
    kind: {
      command: toned(242),
      event: toned(48),
      rejection: toned(23),
      view: toned(136),
    },
  }
})

// Two lights, as plain values a store or a form could hold.
export type Light = Shape.Read<typeof light>

export const paper: Light = {
  ground: '#f9f5eb',
  ink: '#553364',
  dye: '#86469c',
  glow: '#fd53b4',
  tone: { lightness: 0.5, chroma: 0.13 },
}

export const night: Light = {
  ground: '#19161d',
  ink: '#fff3ff',
  dye: '#f4c5ff',
  glow: '#ffb4e3',
  tone: { lightness: 0.8, chroma: 0.11 },
}

// Provide a light, and the shape does the rest.
export const lit = (values: Light): Theme.Theme =>
  look.pipe(
    Shape.provide(Shape.succeed(light, values)),
    Shape.build,
  )
