import { Color, Global, Recipe, Style, Theme, Token, When } from '@pleat/core'

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
  },
  radius: { sm: Token.length, md: Token.length, lg: Token.length },
  shadow: { raised: Token.value },
})

const { color, font, space, text, radius, shadow } = tokens

// THEMES

const shared = {
  font: {
    serif:
      '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
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
    xl: '1.375rem',
    xxl: '2rem',
    display: 'clamp(2.75rem, 7vw, 5.25rem)',
  },
  radius: { sm: '4px', md: '8px', lg: '14px' },
} as const

export const linen = Theme.make(tokens, {
  ...shared,
  color: {
    canvas: 'oklch(97.4% 0.009 80)',
    surface: 'oklch(99.3% 0.004 85)',
    sunken: 'oklch(94.6% 0.012 78)',
    line: 'oklch(88.5% 0.016 72)',
    ink: 'oklch(24% 0.022 50)',
    muted: 'oklch(49% 0.022 58)',
    accent: 'oklch(52% 0.155 34)',
    onAccent: 'oklch(98.5% 0.008 80)',
    accentSoft: 'oklch(93.5% 0.035 42)',
    indigo: 'oklch(45% 0.13 272)',
    green: 'oklch(47% 0.1 150)',
  },
  shadow: {
    raised:
      '0 1px 0 oklch(100% 0 0 / 0.7) inset, 0 12px 32px -18px oklch(30% 0.05 45 / 0.35)',
  },
})

export const indigoNight = Theme.extend(linen, tokens, {
  color: {
    canvas: 'oklch(17.5% 0.022 272)',
    surface: 'oklch(21.5% 0.027 272)',
    sunken: 'oklch(14.5% 0.02 272)',
    line: 'oklch(31% 0.03 272)',
    ink: 'oklch(93% 0.012 82)',
    muted: 'oklch(71% 0.02 80)',
    accent: 'oklch(71% 0.14 42)',
    onAccent: 'oklch(18% 0.022 272)',
    accentSoft: 'oklch(29% 0.06 36)',
    indigo: 'oklch(78% 0.09 272)',
    green: 'oklch(80% 0.1 150)',
  },
  shadow: {
    raised: '0 1px 0 oklch(100% 0 0 / 0.05) inset, 0 16px 40px -20px oklch(0% 0 0 / 0.7)',
  },
})

Global.theme(linen)
Global.theme(indigoNight, { selector: ':root:has([data-theme="Dark"])' })
Global.theme(indigoNight, {
  selector: ':root:has([data-theme="System"])',
  when: When.dark,
})

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
  lineHeight: 1.6,
  WebkitFontSmoothing: 'antialiased',
})
Global.rule('::selection', { backgroundColor: color.accentSoft })
Global.rule('a', { color: 'inherit' })
Global.rule('h1, h2, h3, p, pre, figure, ul, ol', { margin: 0 })

// PLEATS

// NOTE: each pleat is a lit face, a crease, and a face turned away from the
// light, drawn as one repeating gradient so it scales with the token color.
const pleated = (base: string, width: number) => {
  const lit = Color.mix(base, 'white', 22)
  const face = Color.mix(base, 'white', 6)
  const crease = Color.mix(base, 'black', 42)
  const turned = Color.mix(base, 'black', 16)
  const half = width / 2
  return [
    `repeating-linear-gradient(90deg, ${lit} 0px, ${face} ${half - 1}px, ${crease} ${half}px,`,
    `${turned} ${half + 1}px, ${face} ${width}px)`,
  ].join(' ')
}

export const pleatBand = Style.make({
  height: 112,
  borderRadius: radius.lg,
  backgroundImage: pleated(String(color.accent), 48),
  backgroundSize: '100% 100%',
  boxShadow: shadow.raised,
}).pipe(
  Style.when(When.motionSafe, {
    transition: 'background-size 700ms cubic-bezier(0.2, 0.7, 0.2, 1)',
  }),
  Style.when(When.all(When.canHover, When.hover), { backgroundSize: '62% 100%' }),
)

export const pleatMark = Style.make({
  display: 'inline-block',
  width: 22,
  height: 22,
  borderRadius: 5,
  backgroundImage: pleated(String(color.accent), 7),
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
  maxWidth: '72rem',
  marginInline: 'auto',
  paddingInline: space[5],
})

export const prose = Style.make({
  maxWidth: '44rem',
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
  fontFamily: font.mono,
  fontSize: text.xs,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: color.accent,
})

export const display = Style.make({
  fontFamily: font.serif,
  fontSize: text.display,
  fontWeight: 500,
  lineHeight: 1.02,
  letterSpacing: '-0.02em',
  textWrap: 'balance',
})

export const heading = Style.make({
  fontFamily: font.serif,
  fontSize: text.xxl,
  fontWeight: 500,
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  textWrap: 'balance',
})

export const subheading = Style.make({
  fontFamily: font.serif,
  fontSize: text.xl,
  fontWeight: 600,
  lineHeight: 1.25,
})

export const lede = Style.make({
  fontSize: text.xl,
  lineHeight: 1.5,
  color: color.muted,
  maxWidth: '40rem',
  textWrap: 'pretty',
})

export const body = Style.make({ textWrap: 'pretty' })

export const muted = Style.make({ color: color.muted })

export const small = Style.make({ fontSize: text.sm })

export const link = Style.make({
  color: color.accent,
  textDecorationThickness: '1px',
  textUnderlineOffset: '0.18em',
}).pipe(Style.when(When.hover, { textDecorationThickness: '2px' }))

export const inlineCode = Style.make({
  fontFamily: font.mono,
  fontSize: '0.88em',
  backgroundColor: color.sunken,
  borderRadius: radius.sm,
  paddingBlock: '0.1em',
  paddingInline: '0.35em',
})

export const list = Style.make({
  display: 'flex',
  flexDirection: 'column',
  gap: space[2],
  paddingInlineStart: space[5],
})

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
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }).pipe(
    Style.merge(focusRing),
    Style.when(When.motionSafe, {
      transition:
        'background-color 140ms ease, border-color 140ms ease, transform 140ms ease',
    }),
    Style.when(When.active, { transform: 'translateY(1px)' }),
    Style.when(When.disabled, { opacity: 0.5, cursor: 'not-allowed', transform: 'none' }),
  ),
  variants: {
    tone: {
      Primary: Style.make({ backgroundColor: color.accent, color: color.onAccent }).pipe(
        Style.when(When.hover, { backgroundColor: Color.darken(color.accent, 0.06) }),
      ),
      Neutral: Style.make({
        backgroundColor: color.surface,
        color: color.ink,
        borderColor: color.line,
      }).pipe(Style.when(When.hover, { borderColor: color.muted })),
      Quiet: Style.make({ backgroundColor: 'transparent', color: color.ink }).pipe(
        Style.when(When.hover, { backgroundColor: color.sunken }),
      ),
    },
    size: {
      Small: { paddingBlock: space[2], paddingInline: space[3], fontSize: text.sm },
      Medium: { paddingBlock: space[3], paddingInline: space[4], fontSize: text.md },
      Large: { paddingBlock: space[4], paddingInline: space[5], fontSize: text.lg },
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
  border: 'none',
  borderRadius: 6,
  paddingBlock: space[1],
  paddingInline: space[3],
  fontFamily: font.sans,
  fontSize: text.sm,
  fontWeight: 500,
  color: color.muted,
  backgroundColor: 'transparent',
  cursor: 'pointer',
}).pipe(
  Style.merge(focusRing),
  Style.when(When.hover, { color: color.ink }),
  Style.when(When.aria('pressed', 'true'), {
    backgroundColor: color.surface,
    color: color.ink,
    boxShadow: `0 1px 2px ${Color.alpha(color.ink, 0.12)}`,
  }),
)
