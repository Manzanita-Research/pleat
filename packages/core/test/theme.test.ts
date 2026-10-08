import { Effect, Exit } from 'effect'
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

  test('describes values with JSON Schema patterns', () => {
    const decode = Theme.schema(tokens)
    expect(decode.ast._tag).toBe('Objects')
  })
})
