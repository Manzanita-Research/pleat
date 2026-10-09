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
import { type Binding, isRef, type Var } from './var.ts'

// TYPES

/** What a theme can give a token of kind `N` that holds `A`: a value, a {@link Var.Var}, or
 *  another token of the same kind, which aliases it. A token of the `Value` kind can alias a
 *  token of any kind. */
export type Value<A extends string | number, N extends string> =
  A | Var<A> | (string extends N ? Token : N extends 'Value' ? Token : Token<A, N>)

/** Values for every token in a tree. A value may be another token, to alias it. */
export type Values<T> =
  T extends Token<infer A, infer N>
    ? Value<A, N>
    : { readonly [K in keyof T]: Values<T[K]> }

/** Values for some tokens in a tree, for overriding part of a theme. */
export type PartialValues<T> =
  T extends Token<infer A, infer N>
    ? Value<A, N>
    : { readonly [K in keyof T]?: PartialValues<T[K]> }

/** Literal values for every token in a tree, with no aliases: what {@link schema} decodes
 *  from JSON. */
export type LiteralValues<T> =
  T extends Token<infer A, string> ? A : { readonly [K in keyof T]: LiteralValues<T[K]> }

/** An assignment of values to tokens. Applying a theme to a selector sets its custom
 *  properties there, and every style that uses the tokens follows. Themes nest by selector.
 *
 *  An alias is a `var()` reference, and CSS resolves it where the theme is applied, before
 *  descendants inherit the result. So a theme at `:root` that sets `--accent:
 *  var(--blue-500)` gives every descendant the root's blue, even one where `--blue-500` is
 *  set again: re-pointing a primitive doesn't move the semantic tokens built on it. To
 *  retarget them in a scope, apply a whole theme there, such as one from {@link extend},
 *  which declares every alias again. */
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
 *  theme a language model writes is checked before any of it becomes CSS. It decodes literal
 *  values only: an alias is a token, which JSON can't hold. */
export const schema = <T extends object>(
  tokens: T,
): Schema.Codec<LiteralValues<T>, unknown> =>
  // NOTE: the Struct is built by walking the token tree, which mirrors LiteralValues<T>.
  schemaFor(tokens, false) as unknown as Schema.Codec<LiteralValues<T>, unknown>

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

// NOTE: a `Value` token holds any CSS value, so it can alias a token of any kind.
const canAlias = (token: Token, target: Token): boolean =>
  token.kind.name === 'Value' || token.kind.name === target.kind.name

const collect = (
  tokens: object,
  values: unknown,
  path: ReadonlyArray<string>,
  declarations: Array<readonly [string, string]>,
  isComplete: boolean,
): void => {
  if (values === undefined) {
    if (isComplete) {
      throw new Error(
        `[pleat] Theme.make has no value for ${path.join('.') || 'the root'}. Give every ` +
          'token a value, or use Theme.extend to set some of them.',
      )
    }
    return
  }
  if (isToken(tokens)) {
    if (isToken(values) && !canAlias(tokens, values)) {
      throw new Error(
        `[pleat] Theme value for ${path.join('.')} aliases ${values.path.join('.')}, which ` +
          `holds a ${values.kind.name}, not a ${tokens.kind.name}.`,
      )
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
    throw new Error(
      `[pleat] Theme values at ${path.join('.') || 'the root'} must be an object.`,
    )
  }
  for (const [key, child] of Object.entries(tokens)) {
    if (typeof child === 'object' && child !== null) {
      collect(child, Reflect.get(values, key), [...path, key], declarations, isComplete)
    }
  }
}

const REFERENCE = /var\(\s*(--[A-Za-z0-9_-]+)/g

// NOTE: CSS makes every custom property on a reference cycle invalid, so a
// cycle among one theme's declarations is always a mistake. References to
// properties the theme doesn't set resolve from enclosing scopes.
const checkCycles = (declarations: ReadonlyArray<readonly [string, string]>): void => {
  const values = new Map(declarations)
  const visited = new Map<string, 'Visiting' | 'Done'>()
  const visit = (name: string, trail: ReadonlyArray<string>): void => {
    const state = visited.get(name)
    if (state === 'Done') {
      return
    }
    if (state === 'Visiting') {
      const cycle = [...trail.slice(trail.indexOf(name)), name]
      throw new Error(
        `[pleat] Theme aliases form a cycle: ${cycle.join(' → ')}. CSS makes every ` +
          'property on a cycle invalid.',
      )
    }
    visited.set(name, 'Visiting')
    for (const [, target] of (values.get(name) ?? '').matchAll(REFERENCE)) {
      if (target !== undefined && values.has(target)) {
        visit(target, [...trail, name])
      }
    }
    visited.set(name, 'Done')
  }
  for (const [name] of declarations) {
    visit(name, [])
  }
}

const makeTheme = (
  declarations: ReadonlyArray<readonly [string, string]>,
  tokens: ReadonlyMap<string, Token>,
): Theme => {
  checkCycles(declarations)
  return { _tag: 'Theme', declarations, tokens }
}

/** A theme that gives every token in `tokens` a value. Throws when a value is missing or
 *  doesn't match its token's kind, when an alias points at a token of another kind, or when
 *  aliases form a cycle; use {@link decode} for values from outside the program. */
export const make = <T extends object>(
  tokens: T,
  values: Values<T> | LiteralValues<T>,
): Theme => {
  const declarations: Array<readonly [string, string]> = []
  collect(tokens, values, [], declarations, true)
  return makeTheme(declarations, tokensOf(tokens))
}

/** A theme that overrides part of `theme`, such as a brand's accent over a base palette. It
 *  declares every token of `theme` again, not only the overrides, so applying it in a scope
 *  re-resolves the aliases there too. Checks values the way {@link make} does. */
export const extend = <T extends object>(
  theme: Theme,
  tokens: T,
  values: PartialValues<T>,
): Theme => {
  const unioned = unionTokens(theme.tokens, tokensOf(tokens))
  const overrides: Array<readonly [string, string]> = []
  collect(tokens, values, [], overrides, false)
  const merged = new Map(theme.declarations)
  for (const [name, value] of overrides) {
    merged.set(name, value)
  }
  return makeTheme([...merged], unioned)
}

/** One theme from two that set independent tokens, such as a palette and a component
 *  library's tokens, to apply at one selector. Declarations keep their order, `self` first.
 *
 *  Throws when two different tokens share a custom property name, or when both themes set
 *  one token to different values; overriding is what {@link extend} is for. Also throws when
 *  the merged aliases form a cycle. Otherwise merging is
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
  return makeTheme([...declarations], tokens)
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

/** The theme's declarations as {@link Var.Binding}s, to apply it to one element through an
 *  inline style, next to the element's other bindings. With `@pleat/foldkit`:
 *
 *  ```ts
 *  h.div([...css(card, Var.bind(progress, model.percent), ...Theme.bindings(theme))], children)
 *  ```
 *
 *  Its values were checked when the theme was made, so a theme decoded from outside the
 *  program is safe to bind. Like a theme applied at a selector, its aliases resolve on this
 *  element, and descendants inherit the results. */
export const bindings = (theme: Theme): ReadonlyArray<Binding> =>
  theme.declarations.map(([name, value]) => ({ _tag: 'Binding', name, value }))

export type { Kind, Spec, Tokens }
