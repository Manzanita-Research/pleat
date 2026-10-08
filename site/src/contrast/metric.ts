import {
  ColorSpace,
  HSL,
  LCH,
  Lab,
  OKLCH,
  OKLab,
  XYZ_D50,
  XYZ_D65,
  contrastAPCA,
  contrastWCAG21,
  getColor,
  parse,
  sRGB,
  sRGB_Linear,
  to,
  toGamut,
  type PlainColorObject,
} from 'colorjs.io/fn'
import { Option, Schema } from 'effect'

// NOTE: the procedural API only knows the spaces it is given, so the bundle
// carries these and nothing else. Every color a theme can write in hex, a
// name, rgb(), hsl(), lab(), lch(), oklab(), or oklch() parses.
for (const space of [XYZ_D65, XYZ_D50, sRGB_Linear, sRGB, HSL, Lab, LCH, OKLab, OKLCH]) {
  ColorSpace.register(space)
}

// USE CASES

/** What a pair of colors is for. Each metric sets its own minimum for each one. */
export const UseCase = Schema.Literals([
  'BodyText',
  'ContentText',
  'LargeText',
  'SpotText',
  'NonText',
  'Decoration',
])
export type UseCase = typeof UseCase.Type

/** How each use case reads in a sentence, for tables and error messages. */
export const USE_CASE_LABEL: Readonly<Record<UseCase, string>> = {
  BodyText: 'body text',
  ContentText: 'other content text',
  LargeText: 'large text and headlines',
  SpotText: 'placeholders and spot-read text',
  NonText: 'meaningful non-text',
  Decoration: 'dividers and decoration',
}

// COLOR

/** An opaque color in sRGB, ready for a metric. */
export type Srgb = PlainColorObject

/** Parses a CSS color and maps it into sRGB with the CSS Color 4 gamut-mapping algorithm,
 *  the same space both metrics are defined in. None for colors Color.js can't parse
 *  (`var()`, `color-mix()`, relative colors) and for translucent colors, whose contrast
 *  depends on what is behind them. */
export const toSrgb = (css: string): Option.Option<Srgb> => {
  let color: PlainColorObject
  try {
    color = getColor(css)
  } catch {
    return Option.none()
  }
  if (color.alpha !== undefined && color.alpha !== null && Number(color.alpha) < 1) {
    return Option.none()
  }
  return Option.some(toGamut(to(color, 'srgb'), { space: 'srgb', method: 'css' }))
}

/** Whether `css` is inside the sRGB gamut, so the browser shows it as the metric sees it. */
export const isInSrgb = (css: string): boolean => {
  try {
    return to(parse(css), 'srgb').coords.every(
      coordinate =>
        coordinate === null || (coordinate >= -1e-4 && coordinate <= 1 + 1e-4),
    )
  } catch {
    return false
  }
}

// METRICS

/** A way to score text against a background, with a minimum score for each use case. */
export interface Metric {
  readonly name: string
  /** The score for `text` drawn on `background`. A larger magnitude means more contrast. */
  readonly measure: (text: Srgb, background: Srgb) => number
  /** The smallest magnitude that passes for a use case, or undefined when the metric sets none. */
  readonly target: (useCase: UseCase) => number | undefined
  /** A score or a target as it is usually written, such as `Lc 75` or `4.5:1`. */
  readonly format: (score: number) => string
}

// NOTE: scores are truncated for display, never rounded, so a failing 59.96
// doesn't read as a passing 60.
const truncate = (value: number, digits: number): string => {
  const scale = 10 ** digits
  return String(Math.trunc(value * scale) / scale)
}

const APCA_TARGETS: Readonly<Record<UseCase, number>> = {
  BodyText: 75,
  ContentText: 60,
  LargeText: 45,
  SpotText: 30,
  NonText: 30,
  Decoration: 15,
}

/** APCA 0.0.98G, computed with Color.js. Scores are Lc values: positive for dark text on a
 *  light background, negative for light on dark. Targets are the published use-case levels,
 *  which are guidance and still evolving. */
export const apca: Metric = {
  name: 'APCA',
  measure: (text, background) => contrastAPCA(background, text),
  target: useCase => APCA_TARGETS[useCase],
  format: score => `Lc ${truncate(score, 1)}`,
}

const WCAG2_TARGETS: Readonly<Record<UseCase, number | undefined>> = {
  BodyText: 4.5,
  ContentText: 4.5,
  LargeText: 3,
  SpotText: 4.5,
  NonText: 3,
  Decoration: undefined,
}

/** The WCAG 2.x contrast ratio, from 1:1 to 21:1, with the AA minimums: 4.5 for text, 3 for
 *  large text and for non-text that identifies a control (success criteria 1.4.3 and 1.4.11). */
export const wcag2: Metric = {
  name: 'WCAG 2',
  measure: (text, background) => contrastWCAG21(text, background),
  target: useCase => WCAG2_TARGETS[useCase],
  format: score => `${truncate(score, 2)}:1`,
}

/** The metric the site's checks use. Change this one line to check with WCAG 2 instead. */
export const DEFAULT_METRIC: Metric = apca
