import { Theme, Token } from '@pleat/core'

import { check, pair } from '../contrast/check.ts'

export const tokens = Token.make({
  color: {
    surface: Token.color,
    ink: Token.color,
    muted: Token.color,
    accent: Token.color,
    onAccent: Token.color,
    line: Token.color,
  },
})
const { color } = tokens

// Every foreground the design draws on a background, and what it
// is for. The use case sets the target.
export const pairs = [
  pair('Body text', color.ink, color.surface, 'BodyText'),
  pair('Muted text', color.muted, color.surface, 'ContentText'),
  pair('Button label', color.onAccent, color.accent, 'ContentText'),
  pair('Divider', color.line, color.surface, 'Decoration'),
]

export const light = Theme.make(tokens, {
  color: {
    surface: 'oklch(99% 0.005 85)',
    ink: 'oklch(24% 0.02 50)',
    muted: 'oklch(49% 0.02 58)',
    accent: 'oklch(52% 0.155 34)',
    onAccent: 'oklch(98.5% 0.01 80)',
    line: 'oklch(85% 0.015 72)',
  },
})

export const dark = Theme.extend(light, tokens, {
  color: {
    surface: 'oklch(21.5% 0.025 272)',
    ink: 'oklch(93% 0.01 82)',
    muted: 'oklch(80% 0.02 80)',
    accent: 'oklch(80% 0.12 42)',
    onAccent: 'oklch(18% 0.02 272)',
    line: 'oklch(48% 0.03 272)',
  },
})

// One result per pair per theme: a score, its target, and a verdict.
export const results = [light, dark].flatMap(theme =>
  check(theme, pairs),
)
