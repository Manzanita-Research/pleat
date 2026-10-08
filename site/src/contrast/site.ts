import type { Theme } from '@pleat/core'

import { indigoNight, linen, tokens } from '../design.ts'
import { type Pair, pair } from './check.ts'

const { color } = tokens

// NOTE: these point at the site's tokens as design.ts declares them today.
// When semantic token layers land, point the pairs at those instead; the
// checker only needs tokens and themes.

/** Every foreground the site draws on a background, and what it is for. */
export const SITE_PAIRS: ReadonlyArray<Pair> = [
  pair('Ink on canvas', color.ink, color.canvas, 'BodyText'),
  pair('Ink on surface', color.ink, color.surface, 'BodyText'),
  pair('Ink on sunken', color.ink, color.sunken, 'BodyText'),
  pair('Muted on canvas', color.muted, color.canvas, 'ContentText'),
  pair('Muted on surface', color.muted, color.surface, 'ContentText'),
  pair('Muted on sunken', color.muted, color.sunken, 'ContentText'),
  pair('Accent on canvas', color.accent, color.canvas, 'ContentText'),
  pair('Accent on sunken', color.accent, color.sunken, 'ContentText'),
  pair('On-accent on accent', color.onAccent, color.accent, 'ContentText'),
  pair('Ink on accent soft', color.ink, color.accentSoft, 'BodyText'),
  pair('Green on sunken', color.green, color.sunken, 'ContentText'),
  pair('Indigo on sunken', color.indigo, color.sunken, 'ContentText'),
  pair('Line on canvas', color.line, color.canvas, 'Decoration'),
  pair('Line on surface', color.line, color.surface, 'Decoration'),
]

/** The site's themes, by the name the theme switch shows. */
export const SITE_THEMES: ReadonlyArray<readonly [name: string, theme: Theme.Theme]> = [
  ['Light', linen],
  ['Dark', indigoNight],
]
