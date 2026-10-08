import { Cause, Effect, Exit } from 'effect'
import { describe, expect, test } from 'vitest'

import { Theme, Token } from '../src/index.ts'

const tokens = Token.make({
  color: { canvas: Token.color, ink: Token.color, onAccent: Token.color },
  space: { 1: Token.length, 2: Token.length },
  font: { body: Token.fontFamily, weight: Token.number },
})

const light = Theme.make(tokens, {
  color: { canvas: '#ffffff', ink: 'oklch(20% 0.02 260)', onAccent: 'white' },
  space: { 1: '0.25rem', 2: '0.5rem' },
  font: { body: '"Inter", system-ui, sans-serif', weight: 450 },
})

describe('Token', () => {
  test('names custom properties after their path', () => {
    expect(tokens.color.onAccent.name).toBe('--color-on-accent')
    expect(String(tokens.space[2])).toBe('var(--space-2)')
    expect(Token.make({ ink: Token.color }, { prefix: 'brand-' }).ink.name).toBe(
      '--brand-ink',
    )
    expect(Token.leaves(tokens)).toHaveLength(7)
  })

  test('rejects two paths that name the same custom property', () => {
    expect(() => Token.make({ fooBar: Token.color, foo: { bar: Token.length } })).toThrow(
      'Token paths fooBar and foo.bar both name --foo-bar',
    )
  })
})

describe('Theme.merge', () => {
  const palette = Token.make({ blue: { 500: Token.color }, space: { 2: Token.length } })
  const semantic = Token.make({ accent: Token.color, inkSoft: Token.color })
  const base = Theme.make(palette, { blue: { 500: '#1d4ed8' }, space: { 2: '0.5rem' } })
  const roles = Theme.make(semantic, { accent: palette.blue[500], inkSoft: 'gray' })

  test('composes themes for independent token sets', () => {
    expect(Theme.css(Theme.merge(base, roles))).toBe(
      ':root{--blue-500:#1d4ed8;--space-2:0.5rem;--accent:var(--blue-500);--ink-soft:gray}',
    )
    expect(Theme.merge(base, Theme.empty)).toEqual(base)
    expect(Theme.merge(base, base)).toEqual(base)
  })

  test('rejects two token trees that name the same custom property', () => {
    const spacing = Token.make({ space: { 2: Token.length } })
    const other = Theme.make(spacing, { space: { 2: '0.5rem' } })
    expect(() => Theme.merge(base, other)).toThrow(
      'Two token trees both name --space-2 (space.2 and space.2)',
    )
    const inkBar = Token.make({ ink: { soft: Token.color } })
    expect(() =>
      Theme.merge(roles, Theme.make(inkBar, { ink: { soft: 'black' } })),
    ).toThrow('Two token trees both name --ink-soft (inkSoft and ink.soft)')
    expect(() => Theme.extend(base, spacing, { space: { 2: '1rem' } })).toThrow(
      'Two token trees both name --space-2',
    )
  })

  test('rejects two values for one token, which is what extend is for', () => {
    const wide = Theme.extend(base, palette, { space: { 2: '1rem' } })
    expect(() => Theme.merge(base, wide)).toThrow(
      'Both themes set --space-2 (0.5rem and 1rem)',
    )
  })
})

describe('Theme', () => {
  test('renders custom properties at a selector', () => {
    expect(Theme.css(light)).toBe(
      ':root{--color-canvas:#ffffff;--color-ink:oklch(20% 0.02 260);--color-on-accent:white;' +
        '--space-1:0.25rem;--space-2:0.5rem;--font-body:"Inter", system-ui, sans-serif;--font-weight:450}',
    )
  })

  test('extends a theme and aliases tokens', () => {
    const night = Theme.extend(light, tokens, {
      color: { canvas: '#0b0d12', onAccent: tokens.color.canvas },
    })
    expect(Theme.css(night, '[data-theme="night"]')).toContain(
      '--color-canvas:#0b0d12;--color-ink:oklch(20% 0.02 260);--color-on-accent:var(--color-canvas)',
    )
  })

  test('rejects values that do not match their kind', () => {
    expect(() =>
      Theme.make(tokens, {
        color: { canvas: 'red;}body{display:none', ink: 'black', onAccent: 'white' },
        space: { 1: '4px', 2: '8px' },
        font: { body: 'serif', weight: 400 },
      }),
    ).toThrow(/color.canvas is not a valid Color/)
  })

  test('decodes generated values and reports what was wrong', async () => {
    const generated = {
      color: { canvas: '#fafafa', ink: '#111', onAccent: 'url(javascript:alert(1))' },
      space: { 1: '4px', 2: 'eight pixels' },
      font: { body: 'Georgia, serif', weight: 400 },
    }
    const exit = await Effect.runPromiseExit(Theme.decode(tokens, generated))
    expect(Exit.isFailure(exit)).toBe(true)
    const valid = await Effect.runPromise(
      Theme.decode(tokens, {
        ...generated,
        color: { ...generated.color, onAccent: 'white' },
        space: { 1: '4px', 2: '8px' },
      }),
    )
    expect(Theme.css(valid)).toContain('--space-2:8px')
  })

  test('names every wrong value and its kind when decoding fails', async () => {
    const exit = await Effect.runPromiseExit(
      Theme.decode(tokens, {
        color: { canvas: '#fafafa', ink: 'teal; } body {', onAccent: 'white' },
        space: { 1: '4px', 2: 'eight pixels' },
        font: { body: 'Georgia, serif', weight: 400 },
      }),
    )
    if (!Exit.isFailure(exit)) {
      throw new Error('expected the decode to fail')
    }
    const message = String(Cause.squash(exit.cause))
    expect(message).toContain('Expected a CSS color, such as #1d4ed8')
    expect(message).toContain('at ["color"]["ink"]')
    expect(message).toContain('Expected a CSS value without ;')
    expect(message).toContain('Expected a CSS length, such as 0.75rem or 12px')
    expect(message).toContain('at ["space"]["2"]')
    expect(message).not.toContain('RegExp')
  })

  test('describes values with JSON Schema patterns', () => {
    const decode = Theme.schema(tokens)
    expect(decode.ast._tag).toBe('Objects')
  })
})
