import frauncesItalicUrl from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2?url'
import frauncesUrl from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2?url'
import plexMonoUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url'
import plexMonoMediumUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2?url'
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
    teal: Token.color,
    madder: Token.color,
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

const { color, font, space, text, radius } = tokens

// FONTS

/** The fonts this site ships, preloaded by the server entry. */
export const FONT_URLS: ReadonlyArray<string> = [frauncesUrl, plexMonoUrl]

// NOTE: Global.fontFace takes style Declarations, which have no `src` or
// `fontDisplay`, so the descriptors are cast. Reported as API friction.
const fontFace = (descriptors: Readonly<Record<string, string>>): void =>
  Global.fontFace(descriptors as Declarations)

// NOTE: one serif carries the whole site. Fraunces has an optical size axis,
// so the browser picks the text cut for prose and the display cut for titles
// from the same file.
fontFace({
  fontFamily: 'Fraunces',
  fontStyle: 'normal',
  fontWeight: '100 900',
  fontDisplay: 'swap',
  src: `url(${frauncesUrl}) format("woff2")`,
})
fontFace({
  fontFamily: 'Fraunces',
  fontStyle: 'italic',
  fontWeight: '100 900',
  fontDisplay: 'swap',
  src: `url(${frauncesItalicUrl}) format("woff2")`,
})
fontFace({
  fontFamily: 'IBM Plex Mono',
  fontStyle: 'normal',
  fontWeight: '400',
  fontDisplay: 'swap',
  src: `url(${plexMonoUrl}) format("woff2")`,
})
fontFace({
  fontFamily: 'IBM Plex Mono',
  fontStyle: 'normal',
  fontWeight: '500',
  fontDisplay: 'swap',
  src: `url(${plexMonoMediumUrl}) format("woff2")`,
})

// THEMES

const shared = {
  font: {
    serif: 'Fraunces, "Iowan Old Style", "Palatino Linotype", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
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
    sm: '0.9375rem',
    md: '1.0625rem',
    lg: '1.25rem',
    xl: '1.5rem',
    xxl: '2.25rem',
    display: 'clamp(2.75rem, 5.5vw, 4rem)',
    hero: 'clamp(3.25rem, 8.6vw, 7.75rem)',
  },
  radius: { sm: '3px', md: '5px', lg: '8px' },
} as const

// NOTE: paper, ink, and one dye. `brand` is the dye and only ever fills the
// pleat; `accent` is the same hue at a text-safe lightness. Every text pair
// clears APCA Lc 75 for body text (ink) and Lc 60 for secondary text (muted,
// accent) on canvas, surface, and sunken.
export const paper = Theme.make(tokens, {
  ...shared,
  color: {
    canvas: 'oklch(98.3% 0.005 80)',
    surface: 'oklch(99.4% 0.003 80)',
    sunken: 'oklch(95.6% 0.008 80)',
    line: 'oklch(86% 0.009 75)',
    ink: 'oklch(21% 0.012 60)',
    muted: 'oklch(45% 0.016 60)',
    accent: 'oklch(45% 0.21 266)',
    onAccent: 'oklch(98.5% 0.008 80)',
    brand: 'oklch(50% 0.235 265)',
    accentSoft: 'oklch(93.5% 0.035 265)',
    teal: 'oklch(46% 0.1 195)',
    madder: 'oklch(49% 0.17 28)',
  },
  shadow: {
    raised: '0 1px 2px oklch(20% 0.02 60 / 0.06)',
    overlay: '0 24px 48px -24px oklch(20% 0.02 60 / 0.3)',
  },
})

export const night = Theme.extend(paper, tokens, {
  color: {
    canvas: 'oklch(16% 0.007 70)',
    surface: 'oklch(19.5% 0.008 70)',
    sunken: 'oklch(13% 0.006 70)',
    line: 'oklch(33% 0.012 70)',
    ink: 'oklch(94% 0.008 80)',
    muted: 'oklch(74% 0.012 80)',
    accent: 'oklch(78% 0.13 262)',
    onAccent: 'oklch(16% 0.03 265)',
    brand: 'oklch(57% 0.225 265)',
    accentSoft: 'oklch(27% 0.07 265)',
    teal: 'oklch(80% 0.09 195)',
    madder: 'oklch(78% 0.13 35)',
  },
  shadow: {
    raised: '0 1px 0 oklch(100% 0 0 / 0.04) inset',
    overlay: '0 24px 48px -16px oklch(0% 0 0 / 0.7)',
  },
})

Global.theme(paper)
Global.theme(night, { selector: ':root:has([data-theme="Dark"])' })
Global.theme(night, {
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
  fontFamily: font.serif,
  fontSize: text.md,
  lineHeight: 1.6,
  fontOpticalSizing: 'auto',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
})
Global.rule('::selection', {
  backgroundColor: Color.alpha(color.accent, 0.22),
})
Global.rule('a', { color: 'inherit' })
Global.rule('h1, h2, h3, h4, p, pre, figure, ul, ol, dl, dd', { margin: 0 })
Global.rule('button, input, textarea, select', { font: 'inherit' })

// LAYOUT

export const page = Style.make({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
})

export const container = Style.make({
  width: '100%',
  maxWidth: '84rem',
  marginInline: 'auto',
  paddingInline: space[5],
}).pipe(
  Style.when(When.minWidth('48rem'), { paddingInline: space[7] }),
  Style.when(When.minWidth('80rem'), { paddingInline: space[8] }),
)

export const prose = Style.make({
  maxWidth: '42rem',
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

/** A small tracked-caps label, for a figure's parts or a navigation group. */
export const eyebrow = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  fontFamily: font.serif,
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: color.muted,
})

export const display = Style.make({
  fontFamily: font.serif,
  fontSize: text.display,
  fontWeight: 400,
  lineHeight: 1.0,
  letterSpacing: '-0.015em',
  textWrap: 'balance',
})

export const hero = Style.merge(
  display,
  Style.make({
    fontSize: text.hero,
    fontWeight: 380,
    lineHeight: 0.94,
    letterSpacing: '-0.025em',
  }),
)

export const heading = Style.make({
  fontFamily: font.serif,
  fontSize: text.xxl,
  fontWeight: 400,
  lineHeight: 1.1,
  letterSpacing: '-0.012em',
  textWrap: 'balance',
})

export const subheading = Style.make({
  fontFamily: font.serif,
  fontSize: text.lg,
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: '-0.005em',
})

export const lede = Style.make({
  fontSize: text.lg,
  lineHeight: 1.5,
  color: color.muted,
  maxWidth: '40rem',
  textWrap: 'pretty',
}).pipe(Style.when(When.minWidth('48rem'), { fontSize: text.xl, lineHeight: 1.45 }))

export const body = Style.make({ textWrap: 'pretty' })

export const muted = Style.make({ color: color.muted })

export const small = Style.make({ fontSize: text.sm })

export const link = Style.make({
  color: color.accent,
  textDecorationLine: 'underline',
  textDecorationColor: Color.alpha(color.accent, 0.4),
  textDecorationThickness: '1px',
  textUnderlineOffset: '0.2em',
}).pipe(Style.when(When.hover, { textDecorationColor: color.accent }))

export const inlineCode = Style.make({
  fontFamily: font.mono,
  fontSize: '0.84em',
  backgroundColor: Color.alpha(color.ink, 0.065),
  borderRadius: radius.sm,
  paddingBlock: '0.08em',
  paddingInline: '0.35em',
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

/** A quiet bordered surface. The site prefers hairlines to boxes; use sparingly. */
export const card = Style.make({
  backgroundColor: color.surface,
  border: `1px solid ${color.line}`,
  borderRadius: radius.lg,
  padding: space[5],
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
    fontFamily: font.serif,
    fontWeight: 500,
    lineHeight: 1,
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }).pipe(
    Style.merge(focusRing),
    Style.when(When.motionSafe, {
      transition:
        'background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease',
    }),
    Style.when(When.active, { transform: 'translateY(1px)' }),
    Style.when(When.disabled, { opacity: 0.5, cursor: 'not-allowed', transform: 'none' }),
  ),
  variants: {
    tone: {
      Primary: Style.make({ backgroundColor: color.ink, color: color.canvas }).pipe(
        Style.when(When.hover, {
          backgroundColor: Color.mix(color.ink, color.accent, 30),
        }),
      ),
      Neutral: Style.make({
        backgroundColor: 'transparent',
        color: color.ink,
        borderColor: color.line,
      }).pipe(Style.when(When.hover, { borderColor: color.ink })),
      Quiet: Style.make({ backgroundColor: 'transparent', color: color.ink }).pipe(
        Style.when(When.hover, { backgroundColor: tint }),
      ),
    },
    size: {
      Small: { paddingBlock: '0.4375rem', paddingInline: space[3], fontSize: text.sm },
      Medium: { paddingBlock: '0.6875rem', paddingInline: space[4], fontSize: '1rem' },
      Large: { paddingBlock: '0.9375rem', paddingInline: space[5], fontSize: text.md },
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
  padding: 2,
  gap: 2,
  borderRadius: radius.md,
  backgroundColor: Color.alpha(color.ink, 0.05),
})

export const segmentButton = Style.make({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space[1],
  border: 'none',
  borderRadius: radius.sm,
  paddingBlock: '0.3125rem',
  paddingInline: '0.625rem',
  fontFamily: font.serif,
  fontSize: text.sm,
  fontWeight: 500,
  lineHeight: 1.3,
  color: color.muted,
  backgroundColor: 'transparent',
  cursor: 'pointer',
}).pipe(
  Style.merge(focusRing),
  Style.when(When.motionSafe, {
    transition: 'background-color 140ms ease, color 140ms ease',
  }),
  Style.when(When.hover, { color: color.ink }),
  Style.when(When.aria('pressed', 'true'), {
    backgroundColor: color.ink,
    color: color.canvas,
  }),
)
