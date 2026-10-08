import { Effect, Schema } from 'effect'

import { formatNumber } from './property.ts'
import {
  isToken,
  type Kind,
  leaves,
  type Spec,
  type Token,
  type Tokens,
} from './token.ts'
import { isRef, type Ref } from './var.ts'

// TYPES

/** Values for every token in a tree. A value may be another token, to alias it. */
export type Values<T> =
  T extends Token<infer A> ? A | Ref : { readonly [K in keyof T]: Values<T[K]> }

/** Values for some tokens in a tree, for overriding part of a theme. */
export type PartialValues<T> =
  T extends Token<infer A> ? A | Ref : { readonly [K in keyof T]?: PartialValues<T[K]> }

/** An assignment of values to tokens. Applying a theme to a selector sets its custom
 *  properties there, and every style that uses the tokens follows. Themes nest by selector. */
export interface Theme {
  readonly _tag: 'Theme'
  /** Custom property declarations, in token order. */
  readonly declarations: ReadonlyArray<readonly [name: string, value: string]>
  /** Every token of the trees the theme was made from, by custom property name, whether
   *  the theme sets it or not. */
  readonly tokens: ReadonlyMap<string, Token>
}

// SCHEMA

const schemaFor = (tokens: object, isPartial: boolean): Schema.Top => {
  if (isToken(tokens)) {
    return tokens.kind.schema
  }
  const fields: Record<string, Schema.Top> = {}
  for (const [key, child] of Object.entries(tokens)) {
    if (typeof child === 'object' && child !== null) {
      const field = schemaFor(child, isPartial)
      fields[key] = isPartial ? Schema.optionalKey(field) : field
    }
  }
  return Schema.Struct(fields)
}

/** The Schema for a complete set of theme values. Each leaf validates its token's kind, so a
 *  theme a language model writes is checked before any of it becomes CSS. */
export const schema = <T extends object>(tokens: T): Schema.Codec<Values<T>, unknown> =>
  // NOTE: the Struct is built by walking the token tree, which mirrors Values<T>.
  schemaFor(tokens, false) as unknown as Schema.Codec<Values<T>, unknown>

// TOKENS

const tokensOf = (tokens: object): ReadonlyMap<string, Token> =>
  new Map(leaves(tokens).map(token => [token.name, token]))

// NOTE: tokens are compared by identity, so two trees that happen to share a
// path (two `space.2`s from separate `Token.make` calls) still collide.
const unionTokens = (
  left: ReadonlyMap<string, Token>,
  right: ReadonlyMap<string, Token>,
): ReadonlyMap<string, Token> => {
  const union = new Map(left)
  for (const [name, token] of right) {
    const existing = union.get(name)
    if (existing !== undefined && existing !== token) {
      throw new Error(
        `[pleat] Two token trees both name ${name} (${existing.path.join('.')} and ` +
          `${token.path.join('.')}). Give one tree a prefix with Token.make(spec, { prefix }).`,
      )
    }
    union.set(name, token)
  }
  return union
}

// CONSTRUCTORS

/** The theme that sets nothing. The identity of {@link merge}. */
export const empty: Theme = { _tag: 'Theme', declarations: [], tokens: new Map() }

const encode = (token: Token, value: unknown): string =>
  isRef(value)
    ? value.reference
    : typeof value === 'number'
      ? token.kind.name === 'Number'
        ? String(value)
        : formatNumber('width', value)
      : String(value)

const collect = (
  tokens: object,
  values: unknown,
  path: ReadonlyArray<string>,
  declarations: Array<readonly [string, string]>,
): void => {
  if (isToken(tokens)) {
    if (values === undefined) {
      return
    }
    if (!isRef(values)) {
      const result = Schema.decodeUnknownExit(tokens.kind.schema)(values)
      if (result._tag === 'Failure') {
        throw new Error(
          `[pleat] Theme value ${JSON.stringify(values)} for ${path.join('.')} is not a valid ${tokens.kind.name}.`,
        )
      }
    }
    declarations.push([tokens.name, encode(tokens, values)])
    return
  }
  if (typeof values !== 'object' || values === null) {
    if (values !== undefined) {
      throw new Error(
        `[pleat] Theme values at ${path.join('.') || 'the root'} must be an object.`,
      )
    }
    return
  }
  for (const [key, child] of Object.entries(tokens)) {
    if (typeof child === 'object' && child !== null) {
      collect(child, Reflect.get(values, key), [...path, key], declarations)
    }
  }
}

/** A theme that gives every token in `tokens` a value. Throws when a value doesn't match its
 *  token's kind; use {@link decode} for values from outside the program. */
export const make = <T extends object>(tokens: T, values: Values<T>): Theme => {
  const declarations: Array<readonly [string, string]> = []
  collect(tokens, values, [], declarations)
  return { _tag: 'Theme', declarations, tokens: tokensOf(tokens) }
}

/** A theme that overrides part of `theme`, such as a brand's accent over a base palette. */
export const extend = <T extends object>(
  theme: Theme,
  tokens: T,
  values: PartialValues<T>,
): Theme => {
  const unioned = unionTokens(theme.tokens, tokensOf(tokens))
  const overrides: Array<readonly [string, string]> = []
  collect(tokens, values, [], overrides)
  const merged = new Map(theme.declarations)
  for (const [name, value] of overrides) {
    merged.set(name, value)
  }
  return { _tag: 'Theme', declarations: [...merged], tokens: unioned }
}

/** One theme from two that set independent tokens, such as a palette and a component
 *  library's tokens, to apply at one selector. Declarations keep their order, `self` first.
 *
 *  Throws when two different tokens share a custom property name, or when both themes set
 *  one token to different values; overriding is what {@link extend} is for. So merging is
 *  associative and idempotent, with {@link empty} as its identity, and the order of
 *  arguments changes only the order of declarations. */
export const merge = (self: Theme, that: Theme): Theme => {
  const tokens = unionTokens(self.tokens, that.tokens)
  const declarations = new Map(self.declarations)
  for (const [name, value] of that.declarations) {
    const existing = declarations.get(name)
    if (existing !== undefined && existing !== value) {
      throw new Error(
        `[pleat] Both themes set ${name} (${existing} and ${value}). ` +
          'Use Theme.extend to override a value.',
      )
    }
    declarations.set(name, value)
  }
  return { _tag: 'Theme', declarations: [...declarations], tokens }
}

/** Decodes theme values from unknown input, such as a language model's structured output,
 *  and builds the theme. Fails with a `SchemaError` that lists every wrong value, each with
 *  its path and the kind it should have been, such as
 *  `Expected a CSS length, such as 0.75rem or 12px at ["space"]["2"]`. */
export const decode = <T extends object>(
  tokens: T,
  input: unknown,
): Effect.Effect<Theme, Schema.SchemaError> =>
  Effect.map(
    Schema.decodeUnknownEffect(schema(tokens))(input, { errors: 'all' }),
    values => make(tokens, values),
  )

/** The rule that applies `theme` at `selector`. */
export const css = (theme: Theme, selector: string = ':root'): string =>
  `${selector}{${theme.declarations.map(([name, value]) => `${name}:${value}`).join(';')}}`

export type { Kind, Spec, Tokens }
