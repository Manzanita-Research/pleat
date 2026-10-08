import { Theme, Token, Var } from '@pleat/core'
import { Option, Schema } from 'effect'

import { decodeTheme, pair, type Pair } from './check.ts'

// MODEL

/** A color as the demo's sliders edit it: OKLCH lightness in percent, chroma, and hue. */
export const Oklch = Schema.Struct({
  lightness: Schema.Number,
  chroma: Schema.Number,
  hue: Schema.Number,
})
export type Oklch = typeof Oklch.Type

/** The demo's palette, one color per token. */
export const Palette = Schema.Struct({
  surface: Oklch,
  text: Oklch,
  muted: Oklch,
  link: Oklch,
  accent: Oklch,
  onAccent: Oklch,
  placeholder: Oklch,
  border: Oklch,
})
export type Palette = typeof Palette.Type

export const Swatch = Schema.Literals([
  'Surface',
  'Text',
  'Muted',
  'Link',
  'Accent',
  'OnAccent',
  'Placeholder',
  'Border',
])
export type Swatch = typeof Swatch.Type

export const Channel = Schema.Literals(['Lightness', 'Chroma', 'Hue'])
export type Channel = typeof Channel.Type

export const PalettePreset = Schema.Literals(['Light', 'Dark', 'Orange'])
export type PalettePreset = typeof PalettePreset.Type

export const ContrastDemo = Schema.Struct({
  palette: Palette,
  swatch: Swatch,
  preset: Schema.Option(PalettePreset),
})
export type ContrastDemo = typeof ContrastDemo.Type

/** The palette field each swatch edits. */
export const SWATCH_KEY: Readonly<Record<Swatch, keyof Palette>> = {
  Surface: 'surface',
  Text: 'text',
  Muted: 'muted',
  Link: 'link',
  Accent: 'accent',
  OnAccent: 'onAccent',
  Placeholder: 'placeholder',
  Border: 'border',
}

/** The range each slider covers. Chroma stops at 0.37, past the edge of Display P3. */
export const CHANNEL_RANGE: Readonly<
  Record<Channel, Readonly<{ min: number; max: number; step: number }>>
> = {
  Lightness: { min: 0, max: 100, step: 0.5 },
  Chroma: { min: 0, max: 0.37, step: 0.005 },
  Hue: { min: 0, max: 360, step: 1 },
}

export const CHANNEL_KEY: Readonly<Record<Channel, keyof Oklch>> = {
  Lightness: 'lightness',
  Chroma: 'chroma',
  Hue: 'hue',
}

// PRESETS

const oklch = (lightness: number, chroma: number, hue: number): Oklch => ({
  lightness,
  chroma,
  hue,
})

const LIGHT: Palette = {
  surface: oklch(99.5, 0.005, 85),
  text: oklch(24, 0.02, 50),
  muted: oklch(49, 0.02, 58),
  link: oklch(52, 0.155, 34),
  accent: oklch(52, 0.155, 34),
  onAccent: oklch(98.5, 0.01, 80),
  placeholder: oklch(60, 0.015, 70),
  border: oklch(65, 0.015, 72),
}

/** The orange from the WCAG 2 versus APCA comparison: #ff6600, in OKLCH. */
export const ORANGE: Oklch = oklch(69.6, 0.204, 43.5)

/** The demo's starting palettes. Dark uses this site's dark colors. */
export const PRESETS: Readonly<Record<PalettePreset, Palette>> = {
  Light: LIGHT,
  Dark: {
    surface: oklch(21.5, 0.025, 272),
    text: oklch(93, 0.01, 82),
    muted: oklch(71, 0.02, 80),
    link: oklch(71, 0.14, 42),
    accent: oklch(71, 0.14, 42),
    onAccent: oklch(18, 0.02, 272),
    placeholder: oklch(60, 0.02, 272),
    border: oklch(55, 0.02, 272),
  },
  Orange: { ...LIGHT, accent: ORANGE, onAccent: oklch(0, 0, 0) },
}

export const INITIAL_PRESET: PalettePreset = 'Orange'

export const initialContrastDemo: ContrastDemo = {
  palette: PRESETS[INITIAL_PRESET],
  swatch: 'OnAccent',
  preset: Option.some(INITIAL_PRESET),
}

// TOKENS

/** The demo's own tokens. They aren't applied globally: the preview binds them inline. */
export const demoTokens = Token.make(
  {
    color: {
      surface: Token.color,
      text: Token.color,
      muted: Token.color,
      link: Token.color,
      accent: Token.color,
      onAccent: Token.color,
      placeholder: Token.color,
      border: Token.color,
    },
  },
  { prefix: 'demo-' },
)

const { color } = demoTokens

export const DEMO_PAIRS: ReadonlyArray<Pair> = [
  pair('Body text', color.text, color.surface, 'BodyText'),
  pair('Muted text', color.muted, color.surface, 'ContentText'),
  pair('Link', color.link, color.surface, 'ContentText'),
  pair('Button label', color.onAccent, color.accent, 'ContentText'),
  pair('Placeholder', color.placeholder, color.surface, 'SpotText'),
  pair('Input border', color.border, color.surface, 'NonText'),
]

// THEME

const trim = (value: number, digits: number): number => Number(value.toFixed(digits))

/** The CSS for a slider color, such as `oklch(69.6% 0.204 43.5)`. */
export const oklchCss = ({ lightness, chroma, hue }: Oklch): string =>
  `oklch(${trim(lightness, 1)}% ${trim(chroma, 3)} ${trim(hue, 1)})`

/** The palette as theme values, the JSON a model would return for these tokens. */
export const paletteValues = (palette: Palette): Theme.Values<typeof demoTokens> => ({
  color: {
    surface: oklchCss(palette.surface),
    text: oklchCss(palette.text),
    muted: oklchCss(palette.muted),
    link: oklchCss(palette.link),
    accent: oklchCss(palette.accent),
    onAccent: oklchCss(palette.onAccent),
    placeholder: oklchCss(palette.placeholder),
    border: oklchCss(palette.border),
  },
})

/** The palette as a theme for the demo's tokens. */
export const paletteTheme = (palette: Palette): Theme.Theme =>
  Theme.make(demoTokens, paletteValues(palette))

/** Decodes demo theme values and rejects them when a pair misses its target. */
export const decodeDemoTheme = decodeTheme(demoTokens, DEMO_PAIRS)

const bindingVars = new Map<string, Var.Var<string>>()

/** Inline bindings that apply `theme` to one element and its descendants. */
export const themeBindings = (theme: Theme.Theme): ReadonlyArray<Var.Binding> =>
  theme.declarations.map(([name, value]) => {
    let variable = bindingVars.get(name)
    if (variable === undefined) {
      // NOTE: a token's custom property is `--<name>`, the same one
      // Var.string(name) refers to.
      variable = Var.string(name.slice(2))
      bindingVars.set(name, variable)
    }
    return Var.bind(variable, value)
  })
