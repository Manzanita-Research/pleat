import { Schema } from 'effect'

import { isSafeValue } from './property.ts'
import { isRef, makeRef, type Ref } from './var.ts'

// KINDS

const safe = Schema.makeFilter((value: string) =>
  isSafeValue(value)
    ? undefined
    : 'Expected a CSS value without ; { } < ! comments or unbalanced brackets',
)

const COLOR =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\([^;{}<>!]*\))$/
const LENGTH =
  /^(0|-?\d*\.?\d+(px|rem|em|%|vh|vw|vmin|vmax|svh|lvh|dvh|ch|ex|lh|cqi|cqb)|(calc|clamp|min|max|var)\([^;{}<>!]*\))$/
const DURATION = /^(\d*\.?\d+(ms|s)|var\([^;{}<>!]*\))$/
const FONT_FAMILY = /^[A-Za-z0-9 ,"'_.-]+$|^var\([^;{}<>!]*\)$/

// NOTE: `expected` names the kind in decode errors, which would otherwise print the pattern.
const patterned = (pattern: RegExp, title: string, description: string) =>
  Schema.String.check(
    Schema.isPattern(pattern, {
      expected: description.charAt(0).toLowerCase() + description.slice(1, -1),
    }),
    safe,
  ).annotate({ title, description })

/** What kind of value a token holds. The kind's schema validates theme values and describes
 *  them to language models. */
export interface Kind<A extends string | number = string | number> {
  readonly _tag: 'Kind'
  readonly name: string
  readonly schema: Schema.Codec<A>
}

const kind = <A extends string | number>(
  name: string,
  schema: Schema.Codec<A>,
): Kind<A> => ({ _tag: 'Kind', name, schema })

/** A color: hex, a named color, or a color function such as `oklch(…)` or `color-mix(…)`. */
export const color: Kind<string> = kind(
  'Color',
  patterned(COLOR, 'Color', 'A CSS color, such as #1d4ed8 or oklch(62% 0.19 255).'),
)

/** A length such as `1rem`, `12px`, or `clamp(…)`. */
export const length: Kind<string> = kind(
  'Length',
  patterned(LENGTH, 'Length', 'A CSS length, such as 0.75rem or 12px.'),
)

/** A duration such as `150ms`. */
export const duration: Kind<string> = kind(
  'Duration',
  patterned(DURATION, 'Duration', 'A CSS duration, such as 150ms.'),
)

/** A font stack such as `"Inter", system-ui, sans-serif`. */
export const fontFamily: Kind<string> = kind(
  'FontFamily',
  patterned(
    FONT_FAMILY,
    'Font family',
    'A CSS font stack, such as "Inter", system-ui, sans-serif.',
  ),
)

/** A unitless number such as a font weight, line height, or opacity. */
export const number: Kind<number> = kind(
  'Number',
  Schema.Finite.annotate({ title: 'Number', description: 'A unitless number.' }),
)

/** Any other CSS value: a shadow, an easing curve, a gradient. */
export const value: Kind<string> = kind(
  'Value',
  Schema.String.check(safe).annotate({ title: 'Value', description: 'A CSS value.' }),
)

// TOKENS

/** A design token: a named custom property with a kind. Use it anywhere a value goes. */
export interface Token<A extends string | number = string | number> extends Ref {
  readonly kind: Kind<A>
  /** The token's path in its tree, such as `['color', 'ink']`. */
  readonly path: ReadonlyArray<string>
}

/** Whether `value` is a {@link Token}. */
export const isToken = (value: unknown): value is Token =>
  isRef(value) && 'kind' in value && 'path' in value

/** A tree of kinds, the shape of a design system's tokens. */
export type Spec = Kind | { readonly [key: string]: Spec }

/** The tokens for a spec: the same tree with tokens at the leaves. */
export type Tokens<S extends Spec> =
  S extends Kind<infer A>
    ? Token<A>
    : { readonly [K in keyof S]: S[K] extends Spec ? Tokens<S[K]> : never }

const isKind = (spec: Spec): spec is Kind => '_tag' in spec && spec._tag === 'Kind'

const SEGMENT = /^[A-Za-z0-9]+$/

const segmentName = (segment: string): string => {
  if (!SEGMENT.test(segment)) {
    throw new Error(
      `[pleat] Token key ${JSON.stringify(segment)} must be letters and digits, such as onAccent or 2.`,
    )
  }
  return segment.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
}

/** Creates tokens from a spec. Each leaf becomes `--<prefix><path>`: with no prefix,
 *  `color.onAccent` is `--color-on-accent`.
 *
 *  ```ts
 *  const tokens = Token.make({
 *    color: { canvas: Token.color, ink: Token.color, accent: Token.color },
 *    space: { 1: Token.length, 2: Token.length, 3: Token.length },
 *    font: { body: Token.fontFamily },
 *  })
 *  ``` */
export const make = <const S extends Spec>(
  spec: S,
  options: Readonly<{ prefix?: string }> = {},
): Tokens<S> => build(spec, [], options.prefix ?? '') as Tokens<S>

const build = (spec: Spec, path: ReadonlyArray<string>, prefix: string): unknown => {
  if (isKind(spec)) {
    const name = `--${prefix}${path.map(segmentName).join('-')}`
    return makeRef(name, { kind: spec, path })
  }
  return Object.fromEntries(
    Object.entries(spec).map(([key, child]) => [
      key,
      build(child, [...path, key], prefix),
    ]),
  )
}

/** Every token in a tree, depth first. */
export const leaves = (tokens: object): ReadonlyArray<Token> =>
  isToken(tokens)
    ? [tokens]
    : Object.values(tokens).flatMap(child =>
        typeof child === 'object' && child !== null ? leaves(child) : [],
      )
