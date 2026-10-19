import { Effect, Schema } from 'effect'

import { Shape, Theme } from '@pleat/core'

// TYPES

/** One theme the store keeps: the token tree its published values fill, and optionally a
 *  shape that derives the served theme from them. With a shape, a version can be as small
 *  as a palette, and every property that reads the store gets the whole derived theme. */
export interface Entry<T extends object = object> {
  readonly _tag: 'Entry'
  readonly tokens: T
  readonly shape: Shape.Shape<object, T> | undefined
  /** Rules about the built theme, such as contrast, that a version must pass. */
  readonly checks: ReadonlyArray<Theme.Check>
  /** Where the served CSS applies the theme. Default `:root`. */
  readonly selector: string
}

/** The themes a store keeps, by name. Names are lowercase letters, digits, and dashes, and
 *  each one becomes a path: `/<name>.css`. */
export type Catalog = Readonly<Record<string, Entry>>

/** A version that passed its entry's checks: the values as published, and the CSS of the
 *  theme built from them. */
export type Built = Readonly<{ values: unknown; theme: Theme.Theme; css: string }>

const NAME = /^[a-z][a-z0-9-]*$/

// CONSTRUCTORS

/** A theme for the store. Published values are checked against `tokens`, built into
 *  `shape` when there is one, and then run through `checks`.
 *
 *  ```ts
 *  const catalog = Catalog.make({
 *    'house-paper': Catalog.theme(light, { shape: look }),
 *  })
 *  ``` */
export const theme = <T extends object>(
  tokens: T,
  options: Readonly<{
    shape?: Shape.Shape<object, T>
    checks?: ReadonlyArray<Theme.Check>
    selector?: string
  }> = {},
): Entry<T> => ({
  _tag: 'Entry',
  tokens,
  shape: options.shape,
  checks: options.checks ?? [],
  selector: options.selector ?? ':root',
})

/** A catalog. Throws on a name that can't be a path segment. */
export const make = <const C extends Catalog>(entries: C): C => {
  for (const name of Object.keys(entries)) {
    if (!NAME.test(name)) {
      throw new Error(
        `[pleat] Theme name ${JSON.stringify(name)} must be lowercase letters, digits, and dashes.`,
      )
    }
  }
  return entries
}

// BUILDING

const themeOf = (entry: Entry, values: unknown): Theme.Theme => {
  // NOTE: the values were decoded against entry.tokens, so they hold its kinds.
  const provided = Shape.succeed(entry.tokens, values as Theme.LiteralValues<object>)
  return Shape.build(
    entry.shape === undefined ? provided : Shape.provide(entry.shape, provided),
  )
}

/** Decodes values for `entry` from unknown input, such as a request body or a store's JSON,
 *  builds the theme, and runs the entry's checks on it. Fails with a `SchemaError` that
 *  names every wrong value and failed check. */
export const build = (
  entry: Entry,
  input: unknown,
): Effect.Effect<Built, Schema.SchemaError> => {
  const schema = Theme.schema(entry.tokens) as Schema.Codec<unknown, unknown>
  // NOTE: one decode builds the theme once, for every check and the result.
  const cache = new Map<unknown, Theme.Theme>()
  const built = (values: unknown): Theme.Theme => {
    const cached = cache.get(values)
    if (cached !== undefined) {
      return cached
    }
    const theme = themeOf(entry, values)
    cache.set(values, theme)
    return theme
  }
  const [first, ...rest] = entry.checks.map(check =>
    Schema.makeFilter<unknown>(values => check(built(values))),
  )
  const codec = first === undefined ? schema : schema.check(first, ...rest)
  return Effect.map(
    Schema.decodeUnknownEffect(codec)(input, { errors: 'all' }),
    values => {
      const theme = built(values)
      return { values, theme, css: Theme.css(theme, entry.selector) }
    },
  )
}
