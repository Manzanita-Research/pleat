import { Effect, Exit, Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { Paint, Shape, Theme, Token } from '../src/index.ts'

// A light: four colors and a tone. Everything else is derived.
const light = Token.make(
  {
    ground: Token.color,
    ink: Token.color,
    dye: Token.color,
    glow: Token.color,
    tone: { lightness: Token.number, chroma: Token.number },
  },
  { prefix: 'light-' },
)

const color = Token.make(
  {
    ground: Token.color,
    ink: Token.color,
    panel: Token.color,
    rule: Token.color,
    ruleStrong: Token.color,
    muted: Token.color,
    dye: Token.color,
    onDye: Token.color,
    glow: Token.color,
    kind: { command: Token.color, event: Token.color, rejection: Token.color },
    verdict: { good: Token.color, bad: Token.color },
  },
  { prefix: 'color-' },
)

const HUES = { command: 242, event: 48, rejection: 23 } as const

// The shape: roles and operations, no colors.
const look = Shape.make(color, light, ({ ground, ink, dye, glow, tone }) => {
  const toned = (hue: number) => Paint.oklch(tone.lightness, tone.chroma, hue)
  return {
    ground,
    ink,
    panel: Paint.over(ink, ground, 4),
    rule: Paint.over(ink, ground, 20),
    ruleStrong: Paint.over(ink, ground, 40),
    muted: Paint.fade(ink, ground, 60),
    dye,
    onDye: Paint.mostLegible(dye, [ground, ink]),
    glow,
    kind: {
      command: toned(HUES.command),
      event: toned(HUES.event),
      rejection: toned(HUES.rejection),
    },
    verdict: { good: toned(168), bad: color.kind.rejection },
  }
})

const paper = Shape.succeed(light, {
  ground: '#f9f5eb',
  ink: '#553364',
  dye: '#86469c',
  glow: '#fd53b4',
  tone: { lightness: 0.5, chroma: 0.13 },
})

const night = Shape.succeed(light, {
  ground: '#19161d',
  ink: '#fff3ff',
  dye: '#f4c5ff',
  glow: '#ffb4e3',
  tone: { lightness: 0.8, chroma: 0.11 },
})

const valueOf = (theme: Theme.Theme, token: Token.Token): string =>
  Option.getOrThrow(Theme.resolve(theme, token))

describe('Shape', () => {
  test('derives a whole palette from four colors and a tone', () => {
    const theme = Shape.build(look.pipe(Shape.provide(paper)))
    expect(Theme.css(theme)).toBe(
      ':root{--color-ground:#f9f5eb;--color-ink:#553364;--color-panel:#f2ede6;' +
        '--color-rule:#d8ced0;--color-rule-strong:#b7a7b5;--color-muted:#917a96;' +
        '--color-dye:#86469c;--color-on-dye:#f9f5eb;--color-glow:#fd53b4;' +
        '--color-kind-command:#0069a0;--color-kind-event:#9c470d;' +
        '--color-kind-rejection:#a03f3f;--color-verdict-good:#007558;' +
        '--color-verdict-bad:var(--color-kind-rejection)}',
    )
  })

  test('reproduces the values a designer set by hand', () => {
    // Drawn in Paper, partly by hand and partly by these operations, for the
    // same two lights.
    const drawn = {
      paper: {
        panel: '#f2ede6',
        rule: '#d8ced0',
        ruleStrong: '#b7a7b5',
        muted: '#917a95',
        command: '#0b699f',
        good: '#057558',
      },
      night: {
        panel: '#221f26',
        rule: '#47424a',
        ruleStrong: '#756e77',
        muted: '#b9b0ba',
        command: '#7bc6ff',
        good: '#6fd5b0',
      },
    }
    for (const [name, provided] of [
      ['paper', paper],
      ['night', night],
    ] as const) {
      const theme = Shape.build(Shape.provide(look, provided))
      const expected = drawn[name]
      const derived = {
        panel: valueOf(theme, color.panel),
        rule: valueOf(theme, color.rule),
        ruleStrong: valueOf(theme, color.ruleStrong),
        muted: valueOf(theme, color.muted),
        command: valueOf(theme, color.kind.command),
        good: valueOf(theme, color.verdict.good),
      }
      for (const [role, value] of Object.entries(derived)) {
        expect(
          Paint.distance(value, expected[role as keyof typeof expected]),
          `${name} ${role}`,
        ).toBeLessThan(0.005)
      }
    }
  })

  test('keeps the values it was provided to itself, unless asked', () => {
    const hidden = Shape.build(Shape.provide(look, paper))
    expect([...hidden.tokens.keys()].some(name => name.startsWith('--light-'))).toBe(
      false,
    )
    const both = Shape.build(Shape.provideMerge(look, paper))
    expect(Theme.css(both)).toContain('--light-ground:#f9f5eb')
    expect(Theme.css(both)).toContain('--color-panel:#f2ede6')
  })

  test('inlines an alias to a value it keeps to itself', () => {
    const surface = Token.make({ surface: Token.color })
    const aliased = Shape.make(surface, light, () => ({ surface: light.ground }))
    expect(Theme.css(Shape.build(Shape.provide(aliased, paper)))).toBe(
      ':root{--surface:#f9f5eb}',
    )
    expect(Theme.css(Shape.build(Shape.provideMerge(aliased, paper)))).toContain(
      '--surface:var(--light-ground)',
    )
  })

  test('transforms a light with a shape that reads and writes it', () => {
    const deeper = Shape.make(light, light, values => ({
      ...values,
      dye: Paint.oklch(0.45, 0.2, 300),
    }))
    const theme = Shape.build(look.pipe(Shape.provide(deeper), Shape.provide(paper)))
    expect(valueOf(theme, color.dye)).toBe(Paint.oklch(0.45, 0.2, 300))
    expect(valueOf(theme, color.ink)).toBe('#553364')
  })

  test('reads several trees and merges shapes side by side', () => {
    const density = Token.make({ unit: Token.length, scale: Token.number })
    const space = Token.make({ gap: Token.length, rule: Token.color })
    const spacing = Shape.make(
      space,
      [density, light],
      ([{ unit, scale }, { ink, ground }]) => ({
        gap: `calc(${unit} * ${scale * 2})`,
        rule: Paint.over(ink, ground, 20),
      }),
    )
    const page = look.pipe(
      Shape.merge(spacing),
      Shape.provide(paper),
      Shape.provide(Shape.succeed(density, { unit: '24px', scale: 1.5 })),
    )
    const theme = Shape.build(page)
    expect(valueOf(theme, space.gap)).toBe('calc(24px * 3)')
    expect(valueOf(theme, space.rule)).toBe(valueOf(theme, color.rule))
  })

  test('tracks what a shape still needs in its type', () => {
    // @ts-expect-error: the look reads a light, and nothing provides one yet.
    expect(() => Shape.build(look)).toThrow('nothing gives it a value')
    const other = Token.make({ ground: Token.color })
    const partial = Shape.provide(look, Shape.succeed(other, { ground: '#fff' }))
    // @ts-expect-error: a tree with fewer keys doesn't provide the light.
    expect(() => Shape.build(partial)).toThrow('nothing gives it a value')
  })

  test('decodes a light from outside the program before deriving from it', async () => {
    const decoded = await Effect.runPromise(
      Shape.decode(light, {
        ground: '#f9f5eb',
        ink: '#553364',
        dye: '#0b699f',
        glow: '#fd53b4',
        tone: { lightness: 0.5, chroma: 0.13 },
      }),
    )
    const theme = Shape.build(Shape.provide(look, decoded))
    expect(valueOf(theme, color.dye)).toBe('#0b699f')
    const refused = await Effect.runPromiseExit(
      Shape.decode(light, {
        ground: 'red;}',
        ink: '#000',
        dye: '#000',
        glow: '#000',
        tone: { lightness: 0.5, chroma: 0.1 },
      }),
    )
    expect(Exit.isFailure(refused)).toBe(true)
  })
})
