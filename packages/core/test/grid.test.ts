import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import { Grid, Sheet, Style, Token } from '../src/index.ts'

const grid = Grid.gerstner
const stage = Grid.frame(grid, { fit: 'Container', margin: 1 })
const workshop = Grid.frame(grid, { fit: 'Fixed', size: 24, margin: 1 })

const declared = (style: Style.Style): Record<string, string> =>
  Object.fromEntries(
    Style.declarations(style).map(entry => [
      `${entry.condition}|${entry.property}`,
      String(entry.value),
    ]),
  )

describe('Grid.make', () => {
  test('finds the column counts 58 units divide into', () => {
    expect(Grid.exactColumns(58, 2)).toEqual([2, 3, 4, 5, 6, 10, 12, 15, 20])
    expect(Grid.exactColumns(28, 2).slice(0, 2)).toEqual([2, 3])
  })

  test('refuses a split that leaves something over', () => {
    expect(() => Grid.make({ units: 58, gutter: 2, columns: [7] })).toThrow(
      "don't divide into 7 equal columns. Exact column counts are: 2, 3, 4, 5, 6, 10, 12, 15, 20.",
    )
    expect(() =>
      Grid.make({
        units: 58,
        gutter: 2,
        columns: [2],
        half: { units: 29, columns: [2], below: 640 },
      }),
    ).toThrow("29 units with a 2-unit gutter don't divide into 2")
  })

  test('registers the unit as a length so it is computed once', () => {
    expect(grid.unit.name).toBe('--grid-unit')
    expect(Sheet.render()).toContain(
      '@property --grid-unit{syntax:"<length>";inherits:true;initial-value:0px}',
    )
  })
})

describe('Grid.fit', () => {
  test('gives a whole-pixel unit and centres the remainder', () => {
    expect(Grid.fit(grid, stage, 1440)).toEqual({
      unit: 24,
      units: 58,
      isHalf: false,
      margin: 24,
    })
    expect(Grid.fit(grid, stage, 1728).unit).toBe(28)
    expect(Grid.fit(grid, stage, 1920).unit).toBe(32)
    expect(Grid.fit(grid, stage, 1280).unit).toBe(21)
  })

  test('drops to the 28-unit half below 640px', () => {
    expect(Grid.fit(grid, stage, 393)).toEqual({
      unit: 13,
      units: 28,
      isHalf: true,
      margin: 14.5,
    })
    expect(Grid.fit(grid, stage, 639).isHalf).toBe(true)
    expect(Grid.fit(grid, stage, 640).isHalf).toBe(false)
  })

  test('keeps a fixed unit at every width', () => {
    expect(Grid.fit(grid, workshop, 1280)).toEqual({
      unit: 24,
      units: 58,
      isHalf: false,
      margin: -56,
    })
    expect(Grid.fit(grid, workshop, 393).isHalf).toBe(false)
  })

  test('always lands on whole pixels', () => {
    fc.assert(
      fc.property(fc.integer({ min: 120, max: 4000 }), width => {
        const fitted = Grid.fit(grid, stage, width)
        return (
          Number.isInteger(fitted.unit) &&
          fitted.unit * (fitted.units + 2) <= width &&
          (fitted.unit + 1) * (fitted.units + 2) > width
        )
      }),
    )
  })
})

describe('Grid.area', () => {
  test('places every column of every split on whole units, with the gutter between', () => {
    for (const of of grid.columns) {
      const areas = Array.from({ length: of }, (_, index) =>
        Grid.area(grid, { of, at: (index + 1) as Grid.Index<typeof of> }),
      )
      expect(areas[0]?.col).toBe(1)
      const last = areas.at(-1)
      expect((last?.col ?? 0) + (last?.span ?? 0) - 1).toBe(58)
      for (const [left, right] of areas
        .slice(1)
        .map((area, index) => [areas[index], area] as const)) {
        expect((right.col ?? 0) - ((left?.col ?? 0) + (left?.span ?? 0))).toBe(2)
      }
    }
    expect(Grid.area(grid, { of: 3, at: 2, span: 2 })).toEqual({ col: 21, span: 38 })
    expect(Grid.area(grid, { of: 5, at: 2, span: 4 })).toEqual({ col: 13, span: 46 })
  })

  test('lands every placement on whole units in every frame', () => {
    const split = fc.constantFrom(...grid.columns).chain(of =>
      fc.integer({ min: 1, max: of }).chain(at =>
        fc.record({
          of: fc.constant(of),
          at: fc.constant(at),
          span: fc.integer({ min: 1, max: of - at + 1 }),
        }),
      ),
    )
    fc.assert(
      fc.property(split, fc.integer({ min: 640, max: 4000 }), (column, width) => {
        const fitted = Grid.fit(grid, stage, width)
        const box = Grid.resolve(
          fitted,
          Grid.area(grid, column as Grid.Column<2 | 3 | 4 | 5 | 6>),
        )
        return (
          Number.isInteger(box.x) &&
          Number.isInteger(box.width) &&
          box.x % fitted.unit === 0 &&
          box.width % fitted.unit === 0 &&
          box.x + box.width <= fitted.units * fitted.unit
        )
      }),
    )
  })

  test('checks only exact splits and columns that exist, in the types', () => {
    // @ts-expect-error: 58 units don't divide into 7 columns.
    expect(() => Grid.column(grid, { of: 7, at: 1 })).toThrow("don't divide into 7")
    // @ts-expect-error: three columns have no fourth.
    expect(() => Grid.column(grid, { of: 3, at: 4 })).toThrow("doesn't fit in 3 columns")
    const quarters = { of: 4, at: 1 } as const
    // @ts-expect-error: the half divides into 2 or 3, not 4.
    expect(() => Grid.column(grid, { of: 2, at: 1 }, { half: quarters })).toThrow()
  })
})

describe('placement styles', () => {
  test('compile to grid lines, and fill the half unless told otherwise', () => {
    const sheet = Grid.column(grid, { of: 3, at: 2, span: 2, row: 3, rows: 4 })
    const values = declared(sheet)
    expect(values['always|gridColumn']).toBe('21 / span 38')
    expect(values['always|gridRow']).toBe('3 / span 4')
    const half = Object.entries(values).find(
      ([key]) => key.endsWith('|gridColumn') && key !== 'always|gridColumn',
    )
    expect(half?.[0]).toContain('@container grid not (min-width: 640px)')
    expect(half?.[1]).toBe('1 / -1')
    const placed = declared(
      Grid.column(grid, { of: 3, at: 3 }, { half: { of: 2, at: 2 } }),
    )
    expect(Object.values(placed)).toContain('16 / span 13')
  })

  test('sizes the field in units and switches to the half in a container frame only', () => {
    const fieldValues = declared(stage.field)
    expect(fieldValues['always|--grid-unit']).toBe(
      'max(0px, round(down, 100cqi / 60, 1px))',
    )
    expect(fieldValues['always|gridTemplateColumns']).toBe('repeat(58, var(--grid-unit))')
    expect(Object.values(fieldValues)).toContain(
      'max(0px, round(down, 100cqi / 30, 1px))',
    )
    expect(Object.values(fieldValues)).toContain('repeat(28, var(--grid-unit))')
    const fixedValues = declared(workshop.field)
    expect(fixedValues['always|--grid-unit']).toBe('24px')
    expect(Object.keys(fixedValues).every(key => key.startsWith('always|'))).toBe(true)
  })

  test('takes the unit of a fixed frame from a token, so a theme can set the density', () => {
    const density = Token.make({ unit: Token.length }, { prefix: 'density-' })
    const dense = Grid.frame(grid, { fit: 'Fixed', size: density.unit })
    expect(declared(dense.field)['always|--grid-unit']).toBe('var(--density-unit)')
    expect(Grid.fit(grid, dense, 1000, { size: 20 }).unit).toBe(20)
  })

  test('sets type in units with leadings on quarter units', () => {
    const type = Grid.type(grid, {
      Mono: { size: 0.5, leading: 0.75, half: { size: 1, leading: 1.5 } },
      Ui: { size: 0.625, leading: 1 },
    })
    const mono = declared(type({ role: 'Mono' }))
    expect(mono['always|fontSize']).toBe('max(12px, calc(0.5 * var(--grid-unit)))')
    expect(mono['always|lineHeight']).toBe('calc(0.75 * var(--grid-unit))')
    expect(Object.values(mono)).toContain('calc(1.5 * var(--grid-unit))')
    // @ts-expect-error: a leading of 0.8 units wouldn't come back to the grid.
    expect(() => Grid.text(grid, { size: 1, leading: 0.8 })).toThrow('quarter units')
    expect(Grid.units(grid, 1.5)).toBe('calc(1.5 * var(--grid-unit))')
    expect(() => Grid.units(grid, 1.3)).toThrow('quarter units')
  })
})
