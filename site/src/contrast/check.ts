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

/** Scores every pair with `metric` in `scopes`: one theme, or themes applied from the outside
 *  in, such as a brand's palette and then a mode that aliases it. `Theme.resolve` follows the
 *  aliases the way CSS does. */
export const check = (
  scopes: Theme.Theme | ReadonlyArray<Theme.Theme>,
  pairs: ReadonlyArray<Pair>,
  metric: Metric = DEFAULT_METRIC,
): ReadonlyArray<Result> =>
  pairs.map(pair => {
    const text = Theme.resolve(scopes, pair.text)
    const background = Theme.resolve(scopes, pair.background)
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
  Schema.makeFilter<Theme.LiteralValues<T>>(
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
