import { Effect, Schema } from 'effect'

import { formatNumber } from './property.ts'
import { isToken, type Kind, type Spec, type Token, type Tokens } from './token.ts'
import { isRef, type Ref } from './var.ts'

// TYPES

/** Values for every token in a tree. A value may be another token, to alias it. */
export type Values<T> =
  T extends Token<infer A>
    ? A | Ref
    : { readonly [K in keyof T]: Values<T[K]> }

/** Values for some tokens in a tree, for overriding part of a theme. */
export type PartialValues<T> =
  T extends Token<infer A>
    ? A | Ref
    : { readonly [K in keyof T]?: PartialValues<T[K]> }

/** An assignment of values to tokens. Applying a theme to a selector sets its custom
 *  properties there, and every style that uses the tokens follows. Themes nest by selector. */
export interface Theme {
  readonly _tag: 'Theme'
  /** Custom property declarations, in token order. */
  readonly declarations: ReadonlyArray<readonly [name: string, value: string]>
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

// CONSTRUCTORS

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
      throw new Error(`[pleat] Theme values at ${path.join('.') || 'the root'} must be an object.`)
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
  return { _tag: 'Theme', declarations }
}

/** A theme that overrides part of `theme`, such as a brand's accent over a base palette. */
export const extend = <T extends object>(
  theme: Theme,
  tokens: T,
  values: PartialValues<T>,
): Theme => {
  const overrides: Array<readonly [string, string]> = []
  collect(tokens, values, [], overrides)
  const merged = new Map(theme.declarations)
  for (const [name, value] of overrides) {
    merged.set(name, value)
  }
  return { _tag: 'Theme', declarations: [...merged] }
}

/** Decodes theme values from unknown input, such as a language model's structured output,
 *  and builds the theme. Fails with a `SchemaError` that says which values were wrong. */
export const decode = <T extends object>(
  tokens: T,
  input: unknown,
): Effect.Effect<Theme, Schema.SchemaError> =>
  Effect.map(Schema.decodeUnknownEffect(schema(tokens))(input), values =>
    make(tokens, values),
  )

/** The rule that applies `theme` at `selector`. */
export const css = (theme: Theme, selector: string = ':root'): string =>
  `${selector}{${theme.declarations.map(([name, value]) => `${name}:${value}`).join(';')}}`

export type { Kind, Spec, Tokens }
