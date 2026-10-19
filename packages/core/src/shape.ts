import { Effect, Option, type Schema } from 'effect'
import { dual } from 'effect/Function'
import { type Pipeable, pipeArguments } from 'effect/Pipeable'

import * as Theme from './theme.ts'
import { type Token, isToken, leaves } from './token.ts'

// TYPES

const ShapeTypeId = '~@pleat/core/Shape'

/** A theme with parts still to be filled in: values for the tokens in `Out`, once something
 *  provides values for the tokens in `In`. It works the way an Effect `Layer` does. A shape
 *  that needs nothing, made by {@link succeed}, is a set of plain values such as a palette.
 *  A shape made by {@link make} derives its tokens from others, such as semantic colors
 *  computed from four brand colors. {@link provide} feeds one shape into another, and
 *  {@link build} turns a shape that needs nothing more into a {@link Theme.Theme}.
 *
 *  `Out` and `In` are unions of token trees, the objects {@link Token.make} returns. */
export interface Shape<Out extends object, In extends object = never> extends Pipeable {
  readonly [ShapeTypeId]: {
    readonly _Out: (_: never) => Out
    readonly _In: (_: never) => In
  }
  readonly _tag: 'Shape'
  /** The token trees this shape gives values to. */
  readonly provides: ReadonlyArray<object>
  /** The token trees this shape reads, which something must provide before it builds. */
  readonly requires: ReadonlyArray<object>
  /** @internal Builds the shape's theme from the values in `scope`. */
  readonly run: (scope: Theme.Theme) => Theme.Theme
}

/** The token trees a shape provides. */
export type Provides<S> = S extends Shape<infer Out, infer _In> ? Out : never

/** The token trees a shape still needs. */
export type Requires<S> = S extends Shape<infer _Out, infer In> ? In : never

// NOTE: token trees are compared by type, and both ways, so a tree with fewer
// keys doesn't stand in for one with more. Two trees made from the same spec
// look alike here; building checks the actual tokens.
type IsProvided<X, Out> = true extends (
  Out extends unknown
    ? [X] extends [Out]
      ? [Out] extends [X]
        ? true
        : false
      : false
    : never
)
  ? true
  : false

/** What `In` still needs once `Out` is provided. */
export type Remaining<In, Out> = In extends unknown
  ? IsProvided<In, Out> extends true
    ? never
    : In
  : never

/** The values a derivation reads from one token tree: literals, with every alias followed.
 *  Number tokens arrive as numbers, everything else as strings. */
export type Read<T> = Theme.LiteralValues<T>

type ReadAll<F> =
  F extends ReadonlyArray<object> ? { readonly [K in keyof F]: Read<F[K]> } : Read<F>

type Trees<F> = F extends ReadonlyArray<infer T extends object> ? T : F

// CONSTRUCTORS

const ShapeProto = {
  [ShapeTypeId]: { _Out: (_: never) => _, _In: (_: never) => _ },
  _tag: 'Shape' as const,
  pipe() {
    return pipeArguments(this, arguments)
  },
}

const makeShape = <Out extends object, In extends object>(
  provides: ReadonlyArray<object>,
  requires: ReadonlyArray<object>,
  run: (scope: Theme.Theme) => Theme.Theme,
): Shape<Out, In> =>
  Object.assign(Object.create(ShapeProto), {
    provides: unique(provides),
    requires: unique(requires),
    run,
  })

const unique = (trees: ReadonlyArray<object>): ReadonlyArray<object> => [
  ...new Set(trees),
]

/** Whether `value` is a {@link Shape}. */
export const isShape = (value: unknown): value is Shape<object, object> =>
  typeof value === 'object' && value !== null && ShapeTypeId in value

/** A shape that needs nothing: plain values for `tokens`, checked the way
 *  {@link Theme.make} checks them. A palette, or a brand's four colors.
 *
 *  ```ts
 *  const harbor = Shape.succeed(brand, {
 *    ground: '#f9f5eb',
 *    ink: '#1d3557',
 *    dye: '#2a6f97',
 *  })
 *  ``` */
export const succeed = <T extends object>(
  tokens: T,
  values: Theme.Values<T> | Theme.LiteralValues<T>,
): Shape<T> => {
  const theme = Theme.make(tokens, values)
  return makeShape([tokens], [], () => theme)
}

/** A shape that gives `tokens` values derived from the values of `from`: a theme written
 *  as operations, before any colors exist. `derive` gets `from`'s values as literals, every
 *  alias followed, and returns values for `tokens`, checked the way {@link Theme.make}
 *  checks them. Pass an array of trees to read several.
 *
 *  A shape that reads and writes the same tree is a transformation, such as a density that
 *  scales a spacing scale, or a brand that rotates a hue. Provide it a shape for that tree,
 *  and the result has the transformed values.
 *
 *  ```ts
 *  const look = Shape.make(color, brand, ({ ground, ink, dye }) => ({
 *    surface: ground,
 *    text: ink,
 *    line: Paint.over(ink, ground, 20),
 *    muted: Paint.fade(ink, ground, 60),
 *    accent: dye,
 *    onAccent: Paint.mostLegible(dye, [ground, ink]),
 *  }))
 *  ``` */
export const make = <T extends object, const F extends object>(
  tokens: T,
  from: F,
  derive: (values: ReadAll<F>) => Theme.Values<T> | Theme.LiteralValues<T>,
): Shape<T, Trees<F>> => {
  const trees: ReadonlyArray<object> = Array.isArray(from) ? from : [from]
  return makeShape([tokens], trees, scope => {
    const read = trees.map(tree => readTree(tree, scope))
    return Theme.make(
      tokens,
      derive((Array.isArray(from) ? read : read[0]) as ReadAll<F>),
    )
  })
}

const readTree = (tree: object, scope: Theme.Theme): unknown =>
  isToken(tree)
    ? readToken(tree, scope)
    : Object.fromEntries(
        Object.entries(tree).flatMap(([key, child]) =>
          typeof child === 'object' && child !== null
            ? [[key, readTree(child, scope)]]
            : [],
        ),
      )

const readToken = (token: Token, scope: Theme.Theme): string | number => {
  const value = Theme.resolve(scope, token)
  if (Option.isNone(value)) {
    throw new Error(
      `[pleat] A shape reads ${token.name} (${token.path.join('.')}), but nothing gives it a ` +
        'value. Provide a shape for its tree with Shape.provide.',
    )
  }
  return token.kind.name === 'Number' ? Number(value.value) : value.value
}

// NOTE: later declarations win, which is how a transformation's output
// replaces the values it read.
const overlay = (base: Theme.Theme, top: Theme.Theme): Theme.Theme => {
  const declarations = new Map(base.declarations)
  for (const [name, value] of top.declarations) {
    declarations.set(name, value)
  }
  return Theme.makeTheme([...declarations], Theme.unionTokens(base.tokens, top.tokens))
}

const namesOf = (trees: ReadonlyArray<object>): ReadonlySet<string> =>
  new Set(trees.flatMap(tree => leaves(tree).map(token => token.name)))

// COMBINATORS

/** Feeds `that` into `self`: `that`'s values fill what `self` reads. The result provides
 *  what `self` provides, and still needs what `self` needs that `that` doesn't give, plus
 *  whatever `that` needs.
 *
 *  Like `Layer.provide`, it keeps `that`'s values to itself. Where `self` aliases one of
 *  them, the alias becomes the value, so the theme declares only `self`'s tokens. Use
 *  {@link provideMerge} to declare both.
 *
 *  ```ts
 *  const paper = look.pipe(Shape.provide(harbor), Shape.build)
 *  ``` */
export const provide: {
  <Out2 extends object, In2 extends object>(
    that: Shape<Out2, In2>,
  ): <Out extends object, In extends object>(
    self: Shape<Out, In>,
  ) => Shape<Out, Remaining<In, Out2> | In2>
  <Out extends object, In extends object, Out2 extends object, In2 extends object>(
    self: Shape<Out, In>,
    that: Shape<Out2, In2>,
  ): Shape<Out, Remaining<In, Out2> | In2>
} = dual(
  2,
  <Out extends object, In extends object, Out2 extends object, In2 extends object>(
    self: Shape<Out, In>,
    that: Shape<Out2, In2>,
  ): Shape<Out, Remaining<In, Out2> | In2> => {
    const own = namesOf(self.provides)
    const hidden = new Set([...namesOf(that.provides)].filter(name => !own.has(name)))
    return makeShape(
      self.provides,
      [...self.requires.filter(tree => !that.provides.includes(tree)), ...that.requires],
      scope => {
        const inner = overlay(scope, that.run(scope))
        const built = self.run(inner)
        return Theme.inline(built, hidden, overlay(inner, built))
      },
    )
  },
)

/** Feeds `that` into `self`, as {@link provide} does, and keeps `that`'s values too: the
 *  result provides both. Where both give a token a value, such as a transformation that
 *  reads and writes one tree, `self`'s value wins. */
export const provideMerge: {
  <Out2 extends object, In2 extends object>(
    that: Shape<Out2, In2>,
  ): <Out extends object, In extends object>(
    self: Shape<Out, In>,
  ) => Shape<Out | Out2, Remaining<In, Out2> | In2>
  <Out extends object, In extends object, Out2 extends object, In2 extends object>(
    self: Shape<Out, In>,
    that: Shape<Out2, In2>,
  ): Shape<Out | Out2, Remaining<In, Out2> | In2>
} = dual(
  2,
  <Out extends object, In extends object, Out2 extends object, In2 extends object>(
    self: Shape<Out, In>,
    that: Shape<Out2, In2>,
  ): Shape<Out | Out2, Remaining<In, Out2> | In2> =>
    makeShape(
      [...that.provides, ...self.provides],
      [...self.requires.filter(tree => !that.provides.includes(tree)), ...that.requires],
      scope => {
        const given = that.run(scope)
        return overlay(given, self.run(overlay(scope, given)))
      },
    ),
)

/** Two shapes side by side, such as colors and spacing: the result provides what both
 *  provide and needs what either needs. Throws on build when both give one token different
 *  values, as {@link Theme.merge} does. */
export const merge: {
  <Out2 extends object, In2 extends object>(
    that: Shape<Out2, In2>,
  ): <Out extends object, In extends object>(
    self: Shape<Out, In>,
  ) => Shape<Out | Out2, In | In2>
  <Out extends object, In extends object, Out2 extends object, In2 extends object>(
    self: Shape<Out, In>,
    that: Shape<Out2, In2>,
  ): Shape<Out | Out2, In | In2>
} = dual(
  2,
  <Out extends object, In extends object, Out2 extends object, In2 extends object>(
    self: Shape<Out, In>,
    that: Shape<Out2, In2>,
  ): Shape<Out | Out2, In | In2> =>
    makeShape(
      [...self.provides, ...that.provides],
      [...self.requires, ...that.requires],
      scope => Theme.merge(self.run(scope), that.run(scope)),
    ),
)

/** The theme a shape that needs nothing more gives. Throws when a value doesn't match its
 *  token's kind, or when a token it reads has no value, which the types rule out unless two
 *  trees share a spec. */
export const build = <Out extends object>(shape: Shape<Out>): Theme.Theme =>
  shape.run(Theme.empty)

/** Decodes values for `tokens` from unknown input, such as a palette from a theme store or a
 *  language model, into a shape that needs nothing. Fails with a `SchemaError` that lists
 *  every wrong value, as {@link Theme.decode} does, and runs `checks` on its theme.
 *
 *  To check what a palette makes once derived, such as contrast between derived text and
 *  surface colors, build it into the shape that reads it inside the check. */
export const decode = <T extends object>(
  tokens: T,
  input: unknown,
  options: Theme.DecodeOptions = {},
): Effect.Effect<Shape<T>, Schema.SchemaError> =>
  Effect.map(Theme.decode(tokens, input, options), theme =>
    makeShape<T, never>([tokens], [], () => theme),
  )
