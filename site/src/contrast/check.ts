import { Theme, type Token } from '@pleat/core'
import { Effect, Option, Schema } from 'effect'

import {
  DEFAULT_METRIC,
  type Metric,
  type UseCase,
  USE_CASE_LABEL,
  toSrgb,
} from './metric.ts'

// PAIRS

/** A foreground token that a design system draws on a background token, and what it is for. */
export interface Pair {
  readonly name: string
  readonly text: Token.Token
  readonly background: Token.Token
  readonly useCase: UseCase
}

/** Declares that `text` is drawn on `background` for `useCase`. */
export const pair = (
  name: string,
  text: Token.Token,
  background: Token.Token,
  useCase: UseCase,
): Pair => ({ name, text, background, useCase })

// RESOLVING

const VAR = /^var\((--[A-Za-z0-9-]+)\)$/

/** The value `theme` gives `token`, following aliases to other tokens. None when the theme
 *  leaves the token out. */
export const valueOf = (
  theme: Theme.Theme,
  token: Token.Token,
): Option.Option<string> => {
  const values = new Map(theme.declarations)
  const seen = new Set<string>()
  let name = token.name
  for (;;) {
    const value = values.get(name)
    if (value === undefined || seen.has(name)) {
      return Option.none()
    }
    seen.add(name)
    const alias = VAR.exec(value)
    if (alias === null) {
      return Option.some(value)
    }
    name = alias[1] ?? ''
  }
}

// CHECKING

/** Pass, Fail, or Unknown when a color can't be scored, such as a translucent one. Unknown
 *  counts as a failure: a check that can't see a pair can't vouch for it. */
export type Verdict = 'Pass' | 'Fail' | 'Unknown'

/** One pair scored in one theme. */
export interface Result {
  readonly pair: Pair
  readonly text: Option.Option<string>
  readonly background: Option.Option<string>
  readonly score: Option.Option<number>
  readonly target: number | undefined
  readonly verdict: Verdict
}

/** Scores `text` on `background` for a use case. */
export const score = (
  text: string,
  background: string,
  useCase: UseCase,
  metric: Metric = DEFAULT_METRIC,
): Readonly<{
  score: Option.Option<number>
  target: number | undefined
  verdict: Verdict
}> => {
  const target = metric.target(useCase)
  const measured = Option.zipWith(toSrgb(text), toSrgb(background), metric.measure)
  return {
    score: measured,
    target,
    verdict: Option.match(measured, {
      onNone: () => 'Unknown',
      onSome: value =>
        target === undefined || Math.abs(value) >= target ? 'Pass' : 'Fail',
    }),
  }
}

/** Scores every pair in `theme` with `metric`. */
export const check = (
  theme: Theme.Theme,
  pairs: ReadonlyArray<Pair>,
  metric: Metric = DEFAULT_METRIC,
): ReadonlyArray<Result> =>
  pairs.map(pair => {
    const text = valueOf(theme, pair.text)
    const background = valueOf(theme, pair.background)
    const scored = Option.match(Option.all([text, background]), {
      onNone: () => ({
        score: Option.none<number>(),
        target: metric.target(pair.useCase),
        verdict: 'Unknown' as const,
      }),
      onSome: ([textValue, backgroundValue]) =>
        score(textValue, backgroundValue, pair.useCase, metric),
    })
    return { pair, text, background, ...scored }
  })

/** The results that didn't pass. */
export const failures = (results: ReadonlyArray<Result>): ReadonlyArray<Result> =>
  results.filter(result => result.verdict !== 'Pass')

/** A result in a sentence, such as `Muted text is Lc 52.1; the target for other content text
 *  is Lc 60 (APCA)`. */
export const describe = (result: Result, metric: Metric = DEFAULT_METRIC): string => {
  const { pair } = result
  const target =
    result.target === undefined
      ? `${metric.name} sets no target for ${USE_CASE_LABEL[pair.useCase]}`
      : `the target for ${USE_CASE_LABEL[pair.useCase]} is ${metric.format(result.target)} (${metric.name})`
  return Option.match(result.score, {
    onNone: () =>
      `${pair.name} can't be scored: ${Option.getOrElse(result.text, () => 'no value')} on ${Option.getOrElse(result.background, () => 'no value')}`,
    onSome: value => `${pair.name} is ${metric.format(value)}; ${target}`,
  })
}

// DECODING

/** A Schema check on theme values that fails when a pair misses its target. Each failure is
 *  reported at the text token's path, next to any invalid values. */
export const meetsContrast = <T extends object>(
  tokens: T,
  pairs: ReadonlyArray<Pair>,
  metric: Metric = DEFAULT_METRIC,
) =>
  Schema.makeFilter<Theme.Values<T>>(
    values =>
      failures(check(Theme.make(tokens, values), pairs, metric)).map(result => ({
        path: result.pair.text.path,
        issue: describe(result, metric),
      })),
    { title: `${metric.name} contrast` },
  )

/** Like `Theme.decode`, and also rejects values whose pairs miss their contrast targets. */
export const decodeTheme =
  <T extends object>(
    tokens: T,
    pairs: ReadonlyArray<Pair>,
    metric: Metric = DEFAULT_METRIC,
  ) =>
  (input: unknown): Effect.Effect<Theme.Theme, Schema.SchemaError> =>
    Schema.decodeUnknownEffect(
      Theme.schema(tokens).check(meetsContrast(tokens, pairs, metric)),
    )(input).pipe(Effect.map(values => Theme.make(tokens, values)))
