import { Effect, Exit, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { check, describe as describeResult, failures } from '../src/contrast/check.ts'
import { decodeDemoTheme, paletteValues, PRESETS } from '../src/contrast/demo.ts'
import { apca, DEFAULT_METRIC, toSrgb, wcag2 } from '../src/contrast/metric.ts'
import { SITE_PAIRS, SITE_THEMES } from '../src/contrast/site.ts'
import { dark, light, pairs } from '../src/snippet/contrastPairs.ts'

const measure = (metric: typeof apca, textColor: string, background: string): number =>
  Option.getOrThrow(Option.zipWith(toSrgb(textColor), toSrgb(background), metric.measure))

describe('APCA through Color.js', () => {
  // NOTE: text, background, and Lc from the apca-w3 0.1.9 test suite
  // (test/index.js), the published reference for APCA 0.0.98G-4g.
  const REFERENCE: ReadonlyArray<readonly [string, string, number]> = [
    ['#888', '#fff', 63.056469930209424],
    ['#fff', '#888', -68.54146436644962],
    ['#000', '#aaa', 58.146262578561334],
    ['#aaa', '#000', -56.24113336839742],
    ['#123', '#def', 91.66830811481631],
    ['#def', '#123', -93.06770049484275],
    ['#123', '#444', 8.32326136957393],
    ['#444', '#123', -7.526878460278154],
  ]

  it.each(REFERENCE)('scores %s on %s as Lc %d', (textColor, background, lc) => {
    expect(measure(apca, textColor, background)).toBeCloseTo(lc, 9)
  })

  it('scores the same color as an OKLCH value and as hex', () => {
    // NOTE: oklch(62.8% 0.2577 29.23) is sRGB red.
    expect(measure(apca, 'oklch(62.8% 0.2577 29.23)', '#fff')).toBeCloseTo(
      measure(apca, '#f00', '#fff'),
      1,
    )
  })

  it('maps colors outside sRGB into it before scoring', () => {
    const mapped = Option.getOrThrow(toSrgb('oklch(70% 0.35 30)'))
    for (const coordinate of mapped.coords) {
      expect(coordinate).toBeGreaterThanOrEqual(-1e-6)
      expect(coordinate).toBeLessThanOrEqual(1 + 1e-6)
    }
  })

  it('refuses translucent colors and colors resolved later', () => {
    expect(Option.isNone(toSrgb('oklch(50% 0.1 30 / 0.5)'))).toBe(true)
    expect(Option.isNone(toSrgb('var(--color-ink)'))).toBe(true)
  })
})

describe('WCAG 2 through Color.js', () => {
  it.each([
    ['#000', '#fff', 21],
    ['#777', '#fff', 4.48],
    ['#fff', '#767676', 4.54],
  ] as const)('scores %s on %s as %d:1', (textColor, background, ratio) => {
    expect(measure(wcag2, textColor, background)).toBeCloseTo(ratio, 2)
  })
})

describe('the orange example', () => {
  const ORANGE = '#ff6600'

  it('WCAG 2 prefers black text, APCA prefers white', () => {
    expect(measure(wcag2, '#000', ORANGE)).toBeGreaterThan(measure(wcag2, '#fff', ORANGE))
    expect(Math.abs(measure(apca, '#fff', ORANGE))).toBeGreaterThan(
      Math.abs(measure(apca, '#000', ORANGE)),
    )
  })
})

describe('checking themes', () => {
  it('passes the example themes', () => {
    for (const theme of [light, dark]) {
      expect(failures(check(theme, pairs)).map(result => describeResult(result))).toEqual(
        [],
      )
    }
  })

  it('rejects a decoded theme whose pair misses its target, at the token', () => {
    const exit = Effect.runSyncExit(decodeDemoTheme(paletteValues(PRESETS.Dark)))
    expect(Exit.isFailure(exit)).toBe(true)
    expect(String(exit)).toContain('Muted text is Lc')
    expect(String(exit)).toContain('["color"]["muted"]')
  })

  it('accepts a decoded theme whose pairs all pass', () => {
    const exit = Effect.runSyncExit(decodeDemoTheme(paletteValues(PRESETS.Light)))
    expect(Exit.isSuccess(exit)).toBe(true)
  })
})

// THE SITE

// NOTE: failures that are known and accepted go here, so the list can only
// shrink: a new failure fails the test, and so does fixing one without
// taking it off the list. The redesign cleared every entry.
const KNOWN_FAILURES: ReadonlyArray<string> = []

describe('this site', () => {
  it('meets every contrast target in every theme, apart from the known failures', () => {
    const failing = SITE_THEMES.flatMap(([name, theme]) =>
      failures(check(theme, SITE_PAIRS, DEFAULT_METRIC)).map(
        result => `${name}: ${result.pair.name}`,
      ),
    )
    expect(failing).toEqual(KNOWN_FAILURES)
  })
})
