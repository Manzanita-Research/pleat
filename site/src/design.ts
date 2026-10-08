import geistMonoUrl from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url'
import geistUrl from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import instrumentItalicUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url'
import instrumentUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url'
import {
  Color,
  type Declarations,
  Global,
  Recipe,
  Style,
  Theme,
  Token,
  When,
} from '@pleat/core'

// TOKENS

export const tokens = Token.make({
  color: {
    canvas: Token.color,
    surface: Token.color,
    sunken: Token.color,
    line: Token.color,
    ink: Token.color,
    muted: Token.color,
    accent: Token.color,
    onAccent: Token.color,
    brand: Token.color,
    accentSoft: Token.color,
    indigo: Token.color,
    green: Token.color,
  },
  font: { serif: Token.fontFamily, sans: Token.fontFamily, mono: Token.fontFamily },
  space: {
    1: Token.length,
    2: Token.length,
    3: Token.length,
    4: Token.length,
    5: Token.length,
    6: Token.length,
    7: Token.length,
    8: Token.length,
    9: Token.length,
  },
  text: {
    xs: Token.length,
    sm: Token.length,
    md: Token.length,
    lg: Token.length,
    xl: Token.length,
    xxl: Token.length,
    display: Token.length,
    hero: Token.length,
  },
  radius: { sm: Token.length, md: Token.length, lg: Token.length },
  shadow: { raised: Token.value, overlay: Token.value },
})

const { color, font, space, text, radius, shadow } = tokens

// FONTS

/** The fonts this site ships, preloaded by the server entry. */
export const FONT_URLS: ReadonlyArray<string> = [geistUrl, instrumentUrl]

// NOTE: Global.fontFace takes style Declarations, which have no `src` or
// `fontDisplay`, so the descriptors are cast. Reported as API friction.
const fontFace = (descriptors: Readonly<Record<string, string>>): void =>
  Global.fontFace(descriptors as Declarations)

fontFace({
  fontFamily: 'Geist',
  fontStyle: 'normal',
  fontWeight: '100 900',
  fontDisplay: 'swap',
  src: `url(${geistUrl}) format("woff2")`,
})
fontFace({
  fontFamily: 'Geist Mono',
  fontStyle: 'normal',
  fontWeight: '100 900',
  fontDisplay: 'swap',
  src: `url(${geistMonoUrl}) format("woff2")`,
})
fontFace({
  fontFamily: 'Instrument Serif',
  fontStyle: 'normal',
  fontWeight: '400',
  fontDisplay: 'swap',
  src: `url(${instrumentUrl}) format("woff2")`,
})
fontFace({
  fontFamily: 'Instrument Serif',
  fontStyle: 'italic',
  fontWeight: '400',
  fontDisplay: 'swap',
  src: `url(${instrumentItalicUrl}) format("woff2")`,
})

// THEMES

const shared = {
  font: {
    serif: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
    sans: 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  space: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.5rem',
    6: '2rem',
    7: '3rem',
    8: '4.5rem',
    9: '7rem',
  },
  text: {
    xs: '0.8125rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.3125rem',
    xxl: '2.25rem',
    display: 'clamp(2.75rem, 6vw, 4rem)',
    hero: 'clamp(3.25rem, 9vw, 7rem)',
  },
  radius: { sm: '5px', md: '8px', lg: '12px' },
} as const

// NOTE: `brand` only fills the pleats, never text. Every text pair here clears APCA Lc 75 for body text (ink) and Lc 60
// for secondary text (muted, accent) on canvas, surface, and sunken.
export const linen = Theme.make(tokens, {
  ...shared,
  color: {
    canvas: 'oklch(98.8% 0.003 90)',
    surface: 'oklch(100% 0 0)',
    sunken: 'oklch(96.6% 0.005 90)',
    line: 'oklch(90.5% 0.007 90)',
    ink: 'oklch(20.5% 0.015 265)',
    muted: 'oklch(46% 0.014 265)',
    accent: 'oklch(52% 0.19 33)',
    onAccent: 'oklch(99% 0.005 90)',
    brand: 'oklch(52% 0.19 33)',
    accentSoft: 'oklch(95.5% 0.028 38)',
    indigo: 'oklch(46% 0.17 268)',
    green: 'oklch(47% 0.12 155)',
  },
  shadow: {
    raised:
      '0 1px 2px oklch(20% 0.02 265 / 0.06), 0 8px 24px -16px oklch(20% 0.02 265 / 0.18)',
    overlay: '0 24px 48px -24px oklch(20% 0.02 265 / 0.3)',
  },
})

export const indigoNight = Theme.extend(linen, tokens, {
  color: {
    canvas: 'oklch(15.5% 0.014 268)',
    surface: 'oklch(19% 0.016 268)',
    sunken: 'oklch(12.5% 0.012 268)',
    line: 'oklch(28% 0.018 268)',
    ink: 'oklch(95% 0.006 90)',
    muted: 'oklch(82% 0.012 268)',
    accent: 'oklch(81% 0.13 45)',
    onAccent: 'oklch(16% 0.03 35)',
    brand: 'oklch(60% 0.19 36)',
    accentSoft: 'oklch(26% 0.06 38)',
    indigo: 'oklch(82% 0.1 275)',
    green: 'oklch(84% 0.13 155)',
  },
  shadow: {
    raised: '0 1px 0 oklch(100% 0 0 / 0.04) inset, 0 12px 32px -18px oklch(0% 0 0 / 0.8)',
    overlay: '0 24px 48px -16px oklch(0% 0 0 / 0.7)',
  },
})

Global.theme(linen)
Global.theme(indigoNight, { selector: ':root:has([data-theme="Dark"])' })
Global.theme(indigoNight, {
  selector: ':root:has([data-theme="System"])',
  when: When.dark,
})
Global.rule(':root:has([data-theme="Dark"])', { colorScheme: 'dark' })
Global.rule(':root:has([data-theme="Light"])', { colorScheme: 'light' })

// GLOBALS

Global.rule('*, *::before, *::after', { boxSizing: 'border-box' })
Global.rule('html', {
  WebkitTextSizeAdjust: '100%',
  textSizeAdjust: '100%',
  scrollPaddingTop: '5rem',
})
Global.rule('body', {
  margin: 0,
  backgroundColor: color.canvas,
  color: color.ink,
  fontFamily: font.sans,
  fontSize: text.md,
  lineHeight: 1.65,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
})
Global.rule('::selection', { backgroundColor: Color.alpha(color.accent, 0.22) })
Global.rule('a', { color: 'inherit' })
Global.rule('h1, h2, h3, h4, p, pre, figure, ul, ol, dl, dd', { margin: 0 })

// PLEATS

// NOTE: each pleat is a lit face, a crease, and a face turned away from the
// light, drawn as one repeating gradient so it follows the token color in
// every theme.
const pleated = (base: string, width: number) => {
  const lit = Color.mix(base, 'white', 24)
  const face = Color.mix(base, 'white', 6)
  const crease = Color.mix(base, 'black', 45)
  const turned = Color.mix(base, 'black', 18)
  const half = width / 2
  return [
    `repeating-linear-gradient(90deg, ${lit} 0px, ${face} ${half - 1}px, ${crease} ${half}px,`,
    `${turned} ${half + 1}px, ${face} ${width}px)`,
  ].join(' ')
}

export const pleatBand = Style.make({
  height: 'clamp(4.5rem, 10vw, 8rem)',
  borderRadius: radius.lg,
  backgroundImage: pleated(String(color.brand), 44),
  backgroundSize: '100% 100%',
  boxShadow: shadow.raised,
}).pipe(
  Style.when(When.motionSafe, {
    transition: 'background-size 900ms cubic-bezier(0.2, 0.7, 0.2, 1)',
  }),
  Style.when(When.all(When.canHover, When.hover), { backgroundSize: '58% 100%' }),
)

export const pleatMark = Style.make({
  display: 'inline-block',
  width: 20,
  height: 20,
  borderRadius: 5,
  backgroundImage: pleated(String(color.brand), 6.5),
  boxShadow: `0 0 0 1px ${Color.alpha(color.ink, 0.08)}`,
  flexShrink: 0,
})

// LAYOUT

export const page = Style.make({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
})

export const container = Style.make({
  width: '100%',
  maxWidth: '88rem',
  marginInline: 'auto',
  paddingInline: space[5],
}).pipe(Style.when(When.minWidth('48rem'), { paddingInline: space[6] }))

export const prose = Style.make({
  maxWidth: '46rem',
  display: 'flex',
  flexDirection: 'column',
  gap: space[4],
})

const memoizeByToken = (build: (gap: Token.Token) => Style.Style) => {
  const cache = new Map<string, Style.Style>()
  return (gap: Token.Token): Style.Style => {
    const cached = cache.get(gap.name)
    if (cached !== undefined) {
      return cached
    }
    const style = build(gap)
    cache.set(gap.name, style)
    return style
  }
}

export const stack = memoizeByToken(gap =>
  Style.make({ display: 'flex', flexDirection: 'column', gap }),
)

export const row = memoizeByToken(gap =>
  Style.make({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap }),
)

// TYPE

export const eyebrow = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  fontFamily: font.mono,
  fontSize: text.xs,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: color.accent,
})

export const display = Style.make({
  fontFamily: font.serif,
  fontSize: text.display,
  fontWeight: 400,
  lineHeight: 1.02,
  letterSpacing: '-0.015em',
  textWrap: 'balance',
})

export const hero = Style.merge(
  display,
  Style.make({ fontSize: text.hero, lineHeight: 0.94, letterSpacing: '-0.025em' }),
)

/** Italic serif for a word or two of emphasis inside a heading. */
export const flourish = Style.make({ fontStyle: 'italic', color: color.accent })

export const heading = Style.make({
  fontFamily: font.serif,
  fontSize: text.xxl,
  fontWeight: 400,
  lineHeight: 1.08,
  letterSpacing: '-0.01em',
  textWrap: 'balance',
})

export const subheading = Style.make({
  fontFamily: font.sans,
  fontSize: text.lg,
  fontWeight: 600,
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
})

export const lede = Style.make({
  fontSize: text.lg,
  lineHeight: 1.55,
  color: color.muted,
  maxWidth: '42rem',
  textWrap: 'pretty',
}).pipe(Style.when(When.minWidth('48rem'), { fontSize: text.xl, lineHeight: 1.5 }))

export const body = Style.make({ textWrap: 'pretty' })

export const muted = Style.make({ color: color.muted })

export const small = Style.make({ fontSize: text.sm })

export const link = Style.make({
  color: color.ink,
  fontWeight: 500,
  textDecorationLine: 'underline',
  textDecorationColor: color.accent,
  textDecorationThickness: '1px',
  textUnderlineOffset: '0.22em',
}).pipe(Style.when(When.hover, { textDecorationThickness: '2px' }))

export const inlineCode = Style.make({
  fontFamily: font.mono,
  fontSize: '0.875em',
  backgroundColor: color.sunken,
  border: `1px solid ${color.line}`,
  borderRadius: radius.sm,
  paddingBlock: '0.05em',
  paddingInline: '0.3em',
  overflowWrap: 'anywhere',
})

export const list = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
  paddingInlineStart: space[5],
})

/** A list item; colors its marker with the accent. */
export const listItem = Style.make({ paddingInlineStart: space[1] }).pipe(
  Style.when(When.pseudoElement('::marker'), { color: color.accent }),
)

// SURFACES

export const card = Style.make({
  backgroundColor: color.surface,
  border: `1px solid ${color.line}`,
  borderRadius: radius.lg,
  padding: space[5],
  boxShadow: shadow.raised,
})

export const rule = Style.make({
  border: 'none',
  borderTop: `1px solid ${color.line}`,
  marginBlock: 0,
})

// CONTROLS

/** A hover and selection wash that lifts in dark themes and dips in light ones. */
export const tint = Color.alpha(color.ink, 0.06)

export const focusRing = Style.empty.pipe(
  Style.when(When.focusVisible, {
    outline: `2px solid ${color.accent}`,
    outlineOffset: '2px',
  }),
)

export const button = Recipe.make({
  name: 'Button',
  description: 'A button or a link styled as one.',
  base: Style.make({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    border: '1px solid transparent',
    borderRadius: radius.md,
    fontFamily: font.sans,
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }).pipe(
    Style.merge(focusRing),
    Style.when(When.motionSafe, {
      transition:
        'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
    }),
    Style.when(When.active, { transform: 'translateY(1px)' }),
    Style.when(When.disabled, { opacity: 0.5, cursor: 'not-allowed', transform: 'none' }),
  ),
  variants: {
    tone: {
      Primary: Style.make({
        backgroundColor: color.accent,
        color: color.onAccent,
        boxShadow: `0 1px 0 ${Color.alpha('white', 0.2)} inset, 0 1px 2px ${Color.alpha(color.ink, 0.2)}`,
      }).pipe(
        Style.when(When.hover, { backgroundColor: Color.darken(color.accent, 0.05) }),
      ),
      Neutral: Style.make({
        backgroundColor: color.surface,
        color: color.ink,
        borderColor: color.line,
        boxShadow: `0 1px 2px ${Color.alpha(color.ink, 0.06)}`,
      }).pipe(Style.when(When.hover, { borderColor: color.muted })),
      Quiet: Style.make({ backgroundColor: 'transparent', color: color.ink }).pipe(
        Style.when(When.hover, { backgroundColor: tint }),
      ),
    },
    size: {
      Small: { paddingBlock: space[2], paddingInline: space[3], fontSize: text.sm },
      Medium: { paddingBlock: '0.6875rem', paddingInline: space[4], fontSize: text.md },
      Large: { paddingBlock: '0.875rem', paddingInline: space[5], fontSize: text.md },
    },
    isPending: {
      true: Style.make({ cursor: 'progress', opacity: 0.7 }),
      false: Style.empty,
    },
  },
  defaults: { tone: 'Neutral', size: 'Medium', isPending: false },
  descriptions: {
    tone: 'Primary for the main action, Neutral for others, Quiet for low emphasis.',
    size: 'The button’s padding and type size.',
    isPending: 'Whether the button’s action is in progress.',
  },
})

export const segment = Style.make({
  display: 'inline-flex',
  padding: 3,
  gap: 2,
  borderRadius: radius.md,
  backgroundColor: color.sunken,
  border: `1px solid ${color.line}`,
})

export const segmentButton = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space[1],
  border: 'none',
  borderRadius: radius.sm,
  paddingBlock: space[1],
  paddingInline: space[3],
  fontFamily: font.sans,
  fontSize: text.sm,
  fontWeight: 500,
  lineHeight: 1.4,
  color: color.muted,
  backgroundColor: 'transparent',
  cursor: 'pointer',
}).pipe(
  Style.merge(focusRing),
  Style.when(When.hover, { color: color.ink }),
  Style.when(When.aria('pressed', 'true'), {
    backgroundColor: color.surface,
    color: color.ink,
    boxShadow: `0 1px 2px ${Color.alpha(color.ink, 0.14)}, 0 0 0 1px ${Color.alpha(color.ink, 0.04)}`,
  }),
)
