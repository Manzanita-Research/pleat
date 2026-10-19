// NOTE: Color compiles to CSS functions the browser evaluates; Paint computes
// colors now, in JavaScript, so a shape can derive a theme's colors once and
// every consumer (a browser, an editor theme, a contrast check) gets the same
// literal hex. The math is CSS Color 4's: sRGB with its transfer function,
// OKLab and OKLCH through Björn Ottosson's matrices, and APCA 0.0.98G for
// contrast.

type Rgb = readonly [red: number, green: number, blue: number]
type Lab = readonly [lightness: number, a: number, b: number]

// PARSING

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const FUNCTION = /^(rgb|oklch|oklab)\(\s*([^)]*)\)$/i
const NUMBER = /^(-?\d*\.?\d+)(%|deg)?$/

const component = (raw: string, percentScale: number): number => {
  const match = NUMBER.exec(raw)
  if (match === null) {
    return Number.NaN
  }
  const value = Number(match[1])
  return match[2] === '%' ? (value / 100) * percentScale : value
}

const unsupported = (color: string): Error =>
  new Error(
    `[pleat] Paint can't read ${JSON.stringify(color)}. Use an opaque hex color ` +
      '(#rgb or #rrggbb), rgb(r g b), oklab(l a b), or oklch(l c h).',
  )

const parse = (color: string): Rgb => {
  const trimmed = color.trim()
  const hex = HEX.exec(trimmed)?.[1]
  if (hex !== undefined) {
    const digits =
      hex.length === 3
        ? [...hex].map(digit => digit + digit)
        : [0, 2, 4].map(at => hex.slice(at, at + 2))
    return digits.map(pair => Number.parseInt(pair, 16) / 255) as unknown as Rgb
  }
  const match = FUNCTION.exec(trimmed)
  if (match === null) {
    throw unsupported(color)
  }
  const name = (match[1] ?? '').toLowerCase()
  const parts = (match[2] ?? '').split(/[\s,]+/).filter(part => part !== '')
  if (parts.length !== 3) {
    throw unsupported(color)
  }
  const [first = '', second = '', third = ''] = parts
  const values: ReadonlyArray<number> =
    name === 'rgb'
      ? [
          component(first, 255) / 255,
          component(second, 255) / 255,
          component(third, 255) / 255,
        ]
      : name === 'oklab'
        ? [component(first, 1), component(second, 0.4), component(third, 0.4)]
        : [component(first, 1), component(second, 0.4), component(third, 360)]
  if (values.some(Number.isNaN)) {
    throw unsupported(color)
  }
  const [x = 0, y = 0, z = 0] = values
  return name === 'rgb'
    ? [x, y, z]
    : name === 'oklab'
      ? fit(x, Math.hypot(y, z), (Math.atan2(z, y) * 180) / Math.PI)
      : fit(x, y, z)
}

// CONVERSIONS

const toLinear = (channel: number): number =>
  Math.abs(channel) <= 0.04045
    ? channel / 12.92
    : Math.sign(channel) * ((Math.abs(channel) + 0.055) / 1.055) ** 2.4

const toGamma = (channel: number): number =>
  Math.abs(channel) <= 0.0031308
    ? channel * 12.92
    : Math.sign(channel) * (1.055 * Math.abs(channel) ** (1 / 2.4) - 0.055)

const toOklab = (rgb: Rgb): Lab => {
  const [red, green, blue] = rgb.map(toLinear) as unknown as Rgb
  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const medium = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  )
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)
  return [
    0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  ]
}

const fromOklab = ([lightness, a, b]: Lab): Rgb => {
  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map(toGamma) as unknown as Rgb
}

const polar = (lightness: number, chroma: number, hue: number): Lab => [
  lightness,
  chroma * Math.cos((hue * Math.PI) / 180),
  chroma * Math.sin((hue * Math.PI) / 180),
]

const EPSILON = 1e-6

const isInGamut = (rgb: Rgb): boolean =>
  rgb.every(channel => channel >= -EPSILON && channel <= 1 + EPSILON)

// NOTE: CSS maps an out-of-gamut color by lowering its chroma; this does the
// same without the just-noticeable-difference shortcut, so lightness and hue
// stay exactly as asked.
const fit = (lightness: number, chroma: number, hue: number): Rgb => {
  const at = (amount: number): Rgb => fromOklab(polar(lightness, amount, hue))
  if (isInGamut(at(chroma))) {
    return at(chroma)
  }
  let low = 0
  let high = chroma
  while (high - low > EPSILON) {
    const middle = (low + high) / 2
    if (isInGamut(at(middle))) {
      low = middle
    } else {
      high = middle
    }
  }
  return at(low)
}

const format = (rgb: Rgb): string =>
  `#${rgb
    .map(channel =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

// NOTE: APCA 0.0.98G-4g, the version WCAG 3's drafts describe: screen
// luminance with a soft clamp near black, then separate exponents for dark
// text on light and light text on dark.
const luminance = (rgb: Rgb): number => {
  const [red, green, blue] = rgb.map(
    channel => Math.max(0, channel) ** 2.4,
  ) as unknown as Rgb
  const y = 0.2126729 * red + 0.7151522 * green + 0.072175 * blue
  return y > 0.022 ? y : y + (0.022 - y) ** 1.414
}

const lc = (text: Rgb, background: Rgb): number => {
  const textY = luminance(text)
  const backgroundY = luminance(background)
  if (Math.abs(backgroundY - textY) < 0.0005) {
    return 0
  }
  if (backgroundY > textY) {
    const contrast = (backgroundY ** 0.56 - textY ** 0.57) * 1.14
    return contrast < 0.1 ? 0 : (contrast - 0.027) * 100
  }
  const contrast = (backgroundY ** 0.65 - textY ** 0.62) * 1.14
  return contrast > -0.1 ? 0 : (contrast + 0.027) * 100
}

const blend = (base: Rgb, other: Rgb, amount: number): Rgb =>
  base.map(
    (channel, index) => channel + ((other[index] ?? 0) - channel) * amount,
  ) as unknown as Rgb

const percent = (name: string, amount: number): number => {
  if (!Number.isFinite(amount) || amount < 0 || amount > 100) {
    throw new Error(`[pleat] Paint.${name} takes an amount from 0 to 100, not ${amount}.`)
  }
  return amount / 100
}

// OPERATIONS

/** The color as `#rrggbb`. Accepts an opaque hex color, `rgb(r g b)`, `oklab(l a b)`, or
 *  `oklch(l c h)`, and throws on anything else, such as a named color or a `var()`. */
export const hex = (color: string): string => format(parse(color))

/** `color` laid over `background` at `amount` percent opacity: what a translucent ink looks
 *  like on paper. It is the same as CSS `color-mix(in srgb, background, color amount%)`,
 *  computed now.
 *
 *  ```ts
 *  Paint.over('#553364', '#f9f5eb', 20) // '#d8ced0', a hairline
 *  ``` */
export const over = (color: string, background: string, amount: number): string =>
  format(blend(parse(background), parse(color), percent('over', amount)))

/** `amount` percent of `other` mixed into `base` in OKLab, like CSS
 *  `color-mix(in oklab, base, other amount%)` and `Color.mix`, computed now. When the mix
 *  of two vivid colors falls outside sRGB, it lowers chroma as {@link oklch} does, where
 *  browsers today clip each channel. */
export const mix = (base: string, other: string, amount: number): string => {
  const from = toOklab(parse(base))
  const to = toOklab(parse(other))
  const share = percent('mix', amount)
  const [lightness, a, b] = from.map(
    (channel, index) => channel + ((to[index] ?? 0) - channel) * share,
  ) as unknown as Lab
  return format(fit(lightness, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI))
}

/** The color at OKLCH `lightness` (0 to 1), `chroma`, and `hue` (degrees), as `#rrggbb`.
 *  When sRGB can't show that chroma, it gives the most saturated sRGB color with the same
 *  lightness and hue, so colors made from one lightness stay equally light.
 *
 *  ```ts
 *  Paint.oklch(0.5, 0.13, 23) // '#a03f3f'
 *  ``` */
export const oklch = (lightness: number, chroma: number, hue: number): string =>
  format(fit(lightness, chroma, hue))

/** The APCA lightness contrast (Lc) of `text` on `background`, from 0 to about 108, whichever
 *  is lighter. Body text wants about 75, large or secondary text about 60, and
 *  non-text marks about 45. */
export const contrast = (text: string, background: string): number =>
  Math.abs(lc(parse(text), parse(background)))

/** `color` faded toward `background` until its contrast on `background` comes down to
 *  `target` Lc: the most ink-saving color that still reads, such as muted text. Gives
 *  `color` itself when it doesn't reach `target` even at full strength.
 *
 *  ```ts
 *  Paint.fade('#553364', '#f9f5eb', 60) // '#917a96', ink at about 63% over paper
 *  ``` */
export const fade = (color: string, background: string, target: number): string => {
  const ink = parse(color)
  const paper = parse(background)
  if (Math.abs(lc(ink, paper)) <= target) {
    return format(ink)
  }
  let low = 0
  let high = 1
  while (high - low > EPSILON) {
    const middle = (low + high) / 2
    // NOTE: measured after rounding to hex, so the color given reaches target.
    if (Math.abs(lc(parse(format(blend(paper, ink, middle))), paper)) >= target) {
      high = middle
    } else {
      low = middle
    }
  }
  return format(blend(paper, ink, high))
}

/** Whichever of `candidates` reads best on `background`, by {@link contrast}, as given.
 *  The first wins a tie. Throws when there are no candidates.
 *
 *  ```ts
 *  Paint.mostLegible('#86469c', ['#f9f5eb', '#553364']) // '#f9f5eb'
 *  ``` */
export const mostLegible = <const C extends string>(
  background: string,
  candidates: ReadonlyArray<C>,
): C => {
  const [first, ...rest] = candidates
  if (first === undefined) {
    throw new Error('[pleat] Paint.mostLegible needs at least one candidate.')
  }
  return rest.reduce(
    (best, candidate) =>
      contrast(candidate, background) > contrast(best, background) ? candidate : best,
    first,
  )
}

/** How far apart two colors look: the Euclidean distance in OKLab, ΔEOK. About 0.02 is
 *  where most people start to tell two colors apart side by side. */
export const distance = (self: string, that: string): number => {
  const [l1, a1, b1] = toOklab(parse(self))
  const [l2, a2, b2] = toOklab(parse(that))
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}
