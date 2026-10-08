import { Equal } from 'effect'
import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import { Calc, Sheet, Style, When } from '../src/index.ts'
import { condition, style } from './arbitrary.ts'

const RUNS = 400

describe('Style is an idempotent monoid', () => {
  test('merge is associative', () => {
    fc.assert(
      fc.property(style, style, style, (a, b, c) => {
        expect(Style.merge(Style.merge(a, b), c)).toBe(
          Style.merge(a, Style.merge(b, c)),
        )
      }),
      { numRuns: RUNS },
    )
  })

  test('empty is a left and right identity', () => {
    fc.assert(
      fc.property(style, a => {
        expect(Style.merge(Style.empty, a)).toBe(a)
        expect(Style.merge(a, Style.empty)).toBe(a)
      }),
      { numRuns: RUNS },
    )
  })

  test('merge is idempotent', () => {
    fc.assert(
      fc.property(style, a => {
        expect(Style.merge(a, a)).toBe(a)
      }),
      { numRuns: RUNS },
    )
  })

  test('merge is right regular: a, then b, then a again is b then a', () => {
    fc.assert(
      fc.property(style, style, (a, b) => {
        expect(Style.mergeAll([a, b, a])).toBe(Style.merge(b, a))
      }),
      { numRuns: RUNS },
    )
  })

  test('the Effect Reducer agrees with merge', () => {
    fc.assert(
      fc.property(fc.array(style, { maxLength: 5 }), styles => {
        expect(Style.Reducer.combineAll(styles)).toBe(Style.mergeAll(styles))
        expect(Style.Reducer.initialValue).toBe(Style.empty)
      }),
      { numRuns: RUNS },
    )
  })

  test('equal styles are the same object and Equal', () => {
    fc.assert(
      fc.property(style, style, (a, b) => {
        const left = Style.merge(a, b)
        const right = Style.merge(a, b)
        expect(left).toBe(right)
        expect(Equal.equals(left, right)).toBe(true)
      }),
      { numRuns: RUNS },
    )
  })
})

// NOTE: moving a style under a condition it already mentions merges slots
// (a hover rule and a base rule both become hover rules). A normalized style
// keeps precedence order but not authoring order, so the laws below hold for
// conditions the style doesn't already use, which is how nesting is written.
const mentions = (style: Style.Style, when: When.Condition): boolean => {
  const keys = new Set(when.atoms.map(atom => atom.key))
  return style.atoms.some(atom =>
    atom.condition.atoms.some(conditionAtom => keys.has(conditionAtom.key)),
  )
}

describe('conditions act on styles', () => {
  test('under(c) distributes over merge', () => {
    fc.assert(
      fc.property(condition, style, style, (c, a, b) => {
        fc.pre(!mentions(a, c) && !mentions(b, c))
        expect(Style.under(Style.merge(a, b), c)).toBe(
          Style.merge(Style.under(a, c), Style.under(b, c)),
        )
      }),
      { numRuns: RUNS },
    )
  })

  test('under(c) keeps empty empty', () => {
    fc.assert(
      fc.property(condition, c => {
        expect(Style.under(Style.empty, c)).toBe(Style.empty)
      }),
    )
  })

  test('nesting conditions conjoins them', () => {
    fc.assert(
      fc.property(condition, condition, style, (c, d, a) => {
        fc.pre(!mentions(a, c) && !mentions(a, d))
        expect(Style.under(Style.under(a, d), c)).toBe(
          Style.under(a, When.all(c, d)),
        )
      }),
      { numRuns: RUNS },
    )
  })

  test('under(always) is the identity', () => {
    fc.assert(
      fc.property(style, a => {
        expect(Style.under(a, When.always)).toBe(a)
      }),
    )
  })
})

describe('transforms are homomorphisms', () => {
  const bump = Style.evolve({
    paddingTop: (value: string) => Calc.add(value, 4),
    color: () => 'rgb(9, 9, 9)',
  })

  test('evolve distributes over merge', () => {
    fc.assert(
      fc.property(style, style, (a, b) => {
        expect(bump(Style.merge(a, b))).toBe(Style.merge(bump(a), bump(b)))
      }),
      { numRuns: RUNS },
    )
  })

  test('evolve commutes with conditions', () => {
    fc.assert(
      fc.property(condition, style, (c, a) => {
        expect(bump(Style.under(a, c))).toBe(Style.under(bump(a), c))
      }),
      { numRuns: RUNS },
    )
  })
})

describe('class names', () => {
  test('a style compiles to the same classes every time', () => {
    fc.assert(
      fc.property(style, a => {
        const rebuilt = Style.mergeAll(
          [...a.atoms].sort(Sheet.compareAtoms).map(atom =>
            atom._tag === 'Marker'
              ? Style.empty
              : Style.under(Style.make({ [atom.property]: atom.value }), atom.condition),
          ),
        )
        expect(rebuilt.className).toBe(a.className)
      }),
      { numRuns: RUNS },
    )
  })
})
