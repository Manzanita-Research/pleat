import { Theme, Token, Var } from '@pleat/core'
import { Option } from 'effect'
import fc from 'fast-check'
import type { Browser } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { launch } from './chromium.ts'

// The claim under test: Theme.resolve gives the value Chromium computes for a custom
// property inside nested scopes, each with its own theme. The browser computes one side,
// so Theme.resolve can't agree with itself.

const PROGRAMS = 200
const SEED = 20_261_009

let browser: Browser

beforeAll(async () => {
  browser = await launch()
})

afterAll(async () => {
  await browser?.close()
})

/** Nested scopes, outermost first, and the tokens to read in each. */
type Program = Readonly<{
  scopes: ReadonlyArray<Theme.Theme>
  tokens: ReadonlyArray<Token.Token>
}>

const scopeId = (program: number, depth: number): string => `p${program}s${depth}`

const markup = (program: Program, index: number): string =>
  program.scopes.reduceRight(
    (inner, _theme, depth) => `<div id="${scopeId(index, depth)}">${inner}</div>`,
    '',
  )

const rules = (program: Program, index: number): string =>
  program.scopes
    .map((theme, depth) => Theme.css(theme, `#${scopeId(index, depth)}`))
    .join('\n')

/** Every token in every scope where Chromium and Theme.resolve disagree. */
const mismatches = async (
  programs: ReadonlyArray<Program>,
): Promise<ReadonlyArray<string>> => {
  const page = await browser.newPage()
  await page.setContent(
    `<!doctype html><html><head><style>${programs.map(rules).join('\n')}</style></head>` +
      `<body>${programs.map(markup).join('')}</body></html>`,
  )
  const probes = programs.flatMap((program, index) =>
    program.scopes.flatMap((_theme, depth) =>
      program.tokens.map(token => ({
        id: scopeId(index, depth),
        name: token.name,
        expected: Option.getOrElse(
          Theme.resolve(program.scopes.slice(0, depth + 1), token),
          () => '',
        ),
      })),
    ),
  )
  const computed = await page.evaluate(
    probes =>
      probes.map(({ id, name }) => {
        const element = document.getElementById(id)
        return element === null
          ? `no element #${id}`
          : getComputedStyle(element).getPropertyValue(name)
      }),
    probes,
  )
  await page.close()
  return probes.flatMap((probe, index) =>
    computed[index] === probe.expected
      ? []
      : [
          `#${probe.id} ${probe.name}: Chromium ${computed[index]}, resolve ${probe.expected}`,
        ],
  )
}

describe('Theme.resolve follows aliases the way Chromium does', () => {
  test('in a primitive, semantic, and component system with nested scopes', async () => {
    const tokens = Token.make({
      brand: { 500: Token.color, 600: Token.color },
      accent: Token.color,
      accentSoft: Token.color,
      button: { background: Token.color, ring: Token.value },
      unset: Token.color,
    })
    const ring = Var.string('ring', { fallback: 'rgb(0, 0, 0)' })
    const root = Theme.make(
      { brand: tokens.brand, accent: tokens.accent, accentSoft: tokens.accentSoft },
      {
        brand: { 500: 'rgb(59, 130, 246)', 600: 'rgb(37, 99, 235)' },
        accent: tokens.brand[600],
        accentSoft: `color-mix(in srgb, ${tokens.accent} 20%, white)`,
      },
    )
    const components = Theme.make(tokens.button, {
      background: tokens.accent,
      ring: `0 0 0 2px ${ring}`,
    })
    const brandOnly = Theme.make(tokens.brand, {
      500: 'rgb(239, 68, 68)',
      600: 'rgb(220, 38, 38)',
    })
    const reAliased = Theme.extend(root, tokens, { accent: tokens.brand[500] })
    const all = Token.leaves(tokens)

    expect(
      await mismatches([
        { scopes: [Theme.merge(root, components)], tokens: all },
        { scopes: [root, components, brandOnly], tokens: all },
        { scopes: [root, components, brandOnly, reAliased], tokens: all },
      ]),
    ).toEqual([])

    // The trap, in Chromium's own terms: a scope that sets only the brand keeps the
    // root's accent, and the component built on it.
    const trapped = [root, components, brandOnly]
    expect(Theme.resolve(trapped, tokens.brand[600])).toEqual(
      Option.some('rgb(220, 38, 38)'),
    )
    expect(Theme.resolve(trapped, tokens.accent)).toEqual(Option.some('rgb(37, 99, 235)'))
    expect(Theme.resolve(trapped, tokens.button.background)).toEqual(
      Option.some('rgb(37, 99, 235)'),
    )
    expect(Theme.resolve(trapped, tokens.button.ring)).toEqual(
      Option.some('0 0 0 2px rgb(0, 0, 0)'),
    )
    expect(Theme.resolve(trapped, tokens.unset)).toEqual(Option.none())
  })

  test('for random alias graphs, overrides, and fallbacks', async () => {
    const programs = fc.sample(program, { numRuns: PROGRAMS, seed: SEED })
    const found = await mismatches(programs)
    expect(found.slice(0, 5)).toEqual([])
  })
})

// RANDOM PROGRAMS

const SIZE = 6

const randomTokens = Token.make(
  Object.fromEntries(
    Array.from({ length: SIZE }, (_, index) => [`t${index}`, Token.value]),
  ),
) as Readonly<Record<string, Token.Token<string, 'Value'>>>

const all = Object.values(randomTokens)

const missing = Var.string('missing')

// NOTE: an alias only points at a token with a lower index, so a theme's
// aliases never form a cycle, which Theme.make would reject.
const valueFor = (index: number): fc.Arbitrary<string> => {
  const literal = fc.constantFrom('rgb(1, 2, 3)', '4px', '0 0 0 1px red', 'a b')
  if (index === 0) {
    return literal
  }
  const target = fc.integer({ min: 0, max: index - 1 }).map(target => all[target])
  return fc.oneof(
    literal,
    target.map(token => `${token}`),
    target.map(token => `calc(${token} + 1px)`),
    target.map(token => `var(${token?.name}, ${index}px)`),
    target.map(token => `var(${missing.name}, ${token})`),
    fc.constant(`${missing}`),
  )
}

const scope: fc.Arbitrary<Theme.Theme> = fc
  .subarray(
    all.map((_, index) => index),
    { minLength: 1 },
  )
  .chain(indices =>
    fc
      .tuple(...indices.map(valueFor))
      .map(values =>
        Theme.make(
          Object.fromEntries(indices.map(index => [`t${index}`, all[index]])),
          Object.fromEntries(indices.map((index, at) => [`t${index}`, values[at]])),
        ),
      ),
  )

const program: fc.Arbitrary<Program> = fc
  .array(scope, { minLength: 1, maxLength: 4 })
  .map(scopes => ({ scopes, tokens: all }))
