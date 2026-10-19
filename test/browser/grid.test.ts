import fc from 'fast-check'
import type { Browser } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { Grid, Sheet, Style } from '@pleat/core'

import { launch } from './chromium.ts'

// The claim under test: Grid.fit and Grid.resolve say where Chromium puts a field and the
// blocks placed on it, to the pixel, at every width and in every frame. The browser computes
// one side, so the grid can't agree with itself.

const SEED = 20_261_020
const BLOCKS = 24
const WIDTHS = [320, 393, 639, 640, 800, 1000, 1280, 1366, 1440, 1728, 1920, 2560]

const grid = Grid.gerstner
const FRAMES = {
  stage: Grid.frame(grid, { fit: 'Container', margin: 1 }),
  workshop: Grid.frame(grid, { fit: 'Fixed', size: 24, margin: 1 }),
  roomy: Grid.frame(grid, { fit: 'Container', margin: 3, min: 10 }),
} as const

type Of = 2 | 3 | 4 | 5 | 6

type Block = Readonly<{
  column: Grid.Column<Of>
  half: Grid.Column<2 | 3> | undefined
}>

const columnOf = <C extends number>(counts: ReadonlyArray<C>) =>
  fc.constantFrom(...counts).chain(of =>
    fc.integer({ min: 1, max: of }).chain(at =>
      fc.record({
        of: fc.constant(of),
        at: fc.constant(at as Grid.Index<C>),
        span: fc.integer({ min: 1, max: of - at + 1 }).map(span => span as Grid.Index<C>),
        row: fc.integer({ min: 1, max: 20 }),
        rows: fc.integer({ min: 1, max: 4 }),
      }),
    ),
  )

const blocks: ReadonlyArray<Block> = fc.sample(
  fc.record({
    column: columnOf<Of>([2, 3, 4, 5, 6]),
    half: fc.option(columnOf<2 | 3>([2, 3]), { nil: undefined }),
  }),
  { numRuns: BLOCKS, seed: SEED },
)

const placed = blocks.map(block =>
  Grid.column(grid, block.column, block.half === undefined ? {} : { half: block.half }),
)

let browser: Browser

beforeAll(async () => {
  browser = await launch()
})

afterAll(async () => {
  await browser?.close()
})

type Measured = Readonly<{
  unit: string
  field: Readonly<{ x: number; width: number; paddingTop: number }>
  blocks: ReadonlyArray<Readonly<{ x: number; y: number; width: number; height: number }>>
}>

const measure = async (frame: Grid.Frame, width: number): Promise<Measured> => {
  const page = await browser.newPage({
    viewport: { width: Math.max(width, 320), height: 800 },
  })
  const host = Style.use(Style.merge(frame.host, Style.make({ width })))
  const field = Style.use(frame.field)
  const items = placed.map(style => `<div class="${Style.use(style)}"></div>`).join('')
  await page.setContent(
    `<!doctype html><html><head>${Sheet.styleTag()}` +
      '<style>body{margin:0}</style></head>' +
      `<body><div class="${host}"><div id="field" class="${field}">${items}</div></div></body></html>`,
  )
  const measured = await page.evaluate(() => {
    const fieldElement = document.getElementById('field')
    if (fieldElement === null) {
      throw new Error('no field')
    }
    const fieldBox = fieldElement.getBoundingClientRect()
    const style = getComputedStyle(fieldElement)
    return {
      unit: style.getPropertyValue('--grid-unit'),
      field: {
        x: fieldBox.x,
        width: fieldBox.width - 0,
        paddingTop: parseFloat(style.paddingTop),
      },
      blocks: [...fieldElement.children].map(child => {
        const box = child.getBoundingClientRect()
        return {
          x: box.x - fieldBox.x,
          y: box.y - fieldBox.y - parseFloat(style.paddingTop),
          width: box.width,
          height: box.height,
        }
      }),
    }
  })
  await page.close()
  return measured
}

const near = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) < 0.02

describe('Grid in Chromium', () => {
  for (const [name, frame] of Object.entries(FRAMES)) {
    test(`${name}: the unit, the field, and every block land where Grid says`, async () => {
      const problems: Array<string> = []
      for (const width of WIDTHS) {
        const fitted = Grid.fit(grid, frame, width)
        const measured = await measure(frame, width)
        const where = `${name} at ${width}px`
        if (measured.unit !== `${fitted.unit}px`) {
          problems.push(`${where}: unit ${measured.unit}, expected ${fitted.unit}px`)
          continue
        }
        if (!near(measured.field.width, fitted.units * fitted.unit)) {
          problems.push(`${where}: field ${measured.field.width}px wide`)
        }
        if (fitted.margin >= 0 && !near(measured.field.x, fitted.margin)) {
          problems.push(
            `${where}: field starts at ${measured.field.x}, expected ${fitted.margin}`,
          )
        }
        for (const [index, block] of blocks.entries()) {
          const area = fitted.isHalf
            ? block.half === undefined
              ? { col: 1, span: fitted.units }
              : Grid.area({ units: fitted.units, gutter: grid.gutter }, block.half)
            : Grid.area(grid, block.column)
          const expected = Grid.resolve(fitted, area)
          const actual = measured.blocks[index]
          const isOff =
            actual === undefined ||
            !near(actual.x, expected.x) ||
            !near(actual.width, expected.width) ||
            // NOTE: on the half, rows follow content, so only full frames are
            // checked vertically.
            (!fitted.isHalf &&
              (!near(actual.y, expected.y) || !near(actual.height, expected.height)))
          if (isOff) {
            problems.push(
              `${where}, block ${index}: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`,
            )
          }
        }
      }
      expect(problems.slice(0, 5)).toEqual([])
    })
  }
})
