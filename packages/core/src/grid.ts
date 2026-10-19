import type { Declarations } from './declarations.ts'
import * as Recipe from './recipe.ts'
import { registerGlobal } from './sheet.ts'
import * as Style from './style.ts'
import * as Token from './token.ts'
import { type Value, isRef } from './var.ts'
import * as When from './when.ts'

// NOTE: a unit grid in the manner of Karl Gerstner's for Capital (1962): a
// field of square units, a fixed gutter, and a unit count chosen so the field
// divides into several column counts with nothing left over. Everything is
// measured in units; the frame decides how many pixels a unit is, always a
// whole number, so every edge lands on a pixel.

// TYPES

/** The smaller grid a page switches to on a narrow screen, such as Gerstner's 28 units, half
 *  of 58 less a gutter. It keeps the gutter of the grid it belongs to. */
export interface Half<Columns extends number = number> {
  /** How many units across. */
  readonly units: number
  /** The column counts it divides into exactly. */
  readonly columns: ReadonlyArray<Columns>
  /** The width, in CSS pixels, below which a page uses the half. */
  readonly below: number
}

/** A unit grid: how many units across, the gutter between columns, and the column counts
 *  that divide it exactly. A value, like a theme: placing something on it returns an
 *  ordinary {@link Style.Style}, and a frame decides how big a unit is. */
export interface Grid<
  Columns extends number = number,
  HalfColumns extends number = never,
> {
  readonly _tag: 'Grid'
  /** Names the grid's container and prefixes its custom properties. */
  readonly name: string
  /** How many units across. */
  readonly units: number
  /** The gutter between columns, in units. */
  readonly gutter: number
  /** The column counts the grid divides into exactly. */
  readonly columns: ReadonlyArray<Columns>
  /** The grid for narrow screens, if there is one. */
  readonly half: Half<HalfColumns> | undefined
  /** The unit, in whole pixels, as a token every placement reads. The frame sets it. */
  readonly unit: Token.Token<string, 'Length'>
}

/** A place on a grid, counted in units from 1: the first column, how many columns it spans,
 *  and optionally the first row and how many rows. */
export type Area = Readonly<{ col: number; span: number; row?: number; rows?: number }>

/** Where something goes on a grid's columns: column `at` of `of` equal columns, spanning
 *  `span` of them (default 1), with the gutters between. */
export type Column<Of extends number> = Readonly<{
  of: Of
  at: Index<Of>
  span?: Index<Of>
  row?: number
  rows?: number
}>

type Enumerate<N extends number, Acc extends Array<number> = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

/** The column numbers of an `of`-column split: 1 to `of`. */
export type Index<Of extends number> = number extends Of
  ? number
  : Exclude<Enumerate<Of>, 0> | Of

/** A leading in quarter units, so lines of text land back on the unit every four lines at
 *  most: ¼ to 8. */
export type Quarter =
  | 0.25
  | 0.5
  | 0.75
  | 1
  | 1.25
  | 1.5
  | 1.75
  | 2
  | 2.25
  | 2.5
  | 2.75
  | 3
  | 3.25
  | 3.5
  | 3.75
  | 4
  | 4.25
  | 4.5
  | 4.75
  | 5
  | 5.25
  | 5.5
  | 5.75
  | 6
  | 6.25
  | 6.5
  | 6.75
  | 7
  | 7.25
  | 7.5
  | 7.75
  | 8

// CONSTRUCTORS

const NAME = /^[a-z][a-z0-9-]*$/

const isExact = (units: number, gutter: number, columns: number): boolean =>
  Number.isInteger(columns) &&
  columns >= 1 &&
  units - gutter * (columns - 1) > 0 &&
  (units - gutter * (columns - 1)) % columns === 0

const assertWhole = (value: number, what: string): void => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `[pleat] ${what} must be a whole number of units, at least 1, not ${value}.`,
    )
  }
}

const assertExact = (
  units: number,
  gutter: number,
  columns: ReadonlyArray<number>,
): void => {
  for (const count of columns) {
    if (!isExact(units, gutter, count)) {
      throw new Error(
        `[pleat] ${units} units with a ${gutter}-unit gutter don't divide into ${count} ` +
          'equal columns. Exact column counts are: ' +
          exactColumns(units, gutter).join(', ') +
          '.',
      )
    }
  }
}

/** Every column count from 2 to `units` that divides a field of `units` with `gutter`-unit
 *  gutters exactly: for 58 units with 2-unit gutters, 2 to 6, 10, 12, 15, and 20. */
export const exactColumns = (units: number, gutter: number): ReadonlyArray<number> =>
  Array.from({ length: Math.max(0, units - 1) }, (_, index) => index + 2).filter(
    columns => isExact(units, gutter, columns),
  )

/** A grid. Throws when a column count doesn't divide it exactly, so a grid can only offer
 *  splits that land on whole units.
 *
 *  ```ts
 *  const grid = Grid.make({
 *    units: 58,
 *    gutter: 2,
 *    columns: [2, 3, 4, 5, 6],
 *    half: { units: 28, columns: [2, 3], below: 640 },
 *  })
 *  ``` */
export const make = <
  const Columns extends number,
  const HalfColumns extends number = never,
>(
  spec: Readonly<{
    units: number
    gutter: number
    columns: ReadonlyArray<Columns>
    half?: Half<HalfColumns>
    name?: string
  }>,
): Grid<Columns, HalfColumns> => {
  const name = spec.name ?? 'grid'
  if (!NAME.test(name)) {
    throw new Error(
      `[pleat] Grid name ${JSON.stringify(name)} must be lowercase letters, digits, and dashes.`,
    )
  }
  assertWhole(spec.units, 'A grid')
  if (!Number.isInteger(spec.gutter) || spec.gutter < 0) {
    throw new Error(
      `[pleat] A gutter must be a whole number of units, not ${spec.gutter}.`,
    )
  }
  assertExact(spec.units, spec.gutter, spec.columns)
  if (spec.half !== undefined) {
    assertWhole(spec.half.units, 'A half')
    if (spec.half.units > spec.units) {
      throw new Error(
        `[pleat] A half of ${spec.half.units} units is wider than its grid.`,
      )
    }
    assertExact(spec.half.units, spec.gutter, spec.half.columns)
  }
  const { unit } = Token.make({ unit: Token.length }, { prefix: `${name}-` })
  // NOTE: registered as a length so the frame computes it once, in pixels,
  // and every descendant inherits that number rather than recomputing the
  // formula against its own nearest container.
  registerGlobal({
    id: `property:${unit.name}`,
    layer: 'globals',
    rule: `@property ${unit.name}{syntax:"<length>";inherits:true;initial-value:0px}`,
  })
  return {
    _tag: 'Grid',
    name,
    units: spec.units,
    gutter: spec.gutter,
    columns: spec.columns,
    half: spec.half,
    unit,
  }
}

/** Gerstner's 58: 58 units with 2-unit gutters, which divide into 2, 3, 4, 5, or 6 columns
 *  (28, 18, 13, 10, or 8 units wide). Below 640px a page switches to its 28-unit half, which
 *  divides into 2 or 3 (13 or 8 units). */
export const gerstner: Grid<2 | 3 | 4 | 5 | 6, 2 | 3> = make({
  units: 58,
  gutter: 2,
  columns: [2, 3, 4, 5, 6],
  half: { units: 28, columns: [2, 3], below: 640 },
})

/** `n` units as a CSS length, for spacing that stays on the grid. Takes quarter units. */
export const units = (grid: Grid<number, number>, n: number): string => {
  if (!Number.isFinite(n) || !Number.isInteger(n * 4)) {
    throw new Error(`[pleat] Grid.units takes whole or quarter units, not ${n}.`)
  }
  return `calc(${n} * ${grid.unit.reference})`
}

// FRAMES

/** How a frame sizes its unit: to its container's width, to the viewport's, or to a fixed
 *  length. */
export type Fit = 'Container' | 'Viewport' | 'Fixed'

/** How a page fits a grid to its window. The unit is the only pixel value in it, always
 *  whole: `floor(width / (units + 2 × margin))`, with the remainder split between the two
 *  sides. Below the half's width, the page uses the half.
 *
 *  Put {@link Frame.host} on the element whose width the grid fills, and
 *  {@link Frame.field} on the element inside it that holds the placed blocks. */
export interface Frame {
  readonly _tag: 'Frame'
  readonly fit: Fit
  /** Units of margin on each side, counted into the width before the unit is found. */
  readonly margin: number
  /** The smallest the unit may get, in pixels. Below it the field scrolls. */
  readonly min: number
  /** The unit of a `Fixed` frame: a length, or a token so a theme can set the density. */
  readonly size: Value | undefined
  /** The element whose width the grid fills. */
  readonly host: Style.Style
  /** The element that holds the blocks: a CSS grid of whole units. */
  readonly field: Style.Style
}

const isHalfFrame = (fit: Fit): boolean => fit !== 'Fixed'

/** The condition that holds where a grid has switched to its half: a container query on the
 *  frame's host. Never holds in a `Fixed` frame. */
export const isHalf = (grid: Grid<number, number>): When.Condition =>
  When.container(`not (min-width: ${grid.half?.below ?? 0}px)`, grid.name)

const fluidUnit = (fit: Fit, across: number, min: number): string =>
  `max(${min}px, round(down, ${fit === 'Viewport' ? '100vi' : '100cqi'} / ${across}, 1px))`

const lengthOf = (value: Value): string =>
  typeof value === 'number' ? `${value}px` : isRef(value) ? value.reference : value

/** A frame for `grid`.
 *
 *  ```ts
 *  // The stage scales with its container and drops to the half below 640px.
 *  const stage = Grid.frame(Grid.gerstner, { fit: 'Container', margin: 1 })
 *  // A workshop keeps a 24px unit, so 12px type stays 12px on a big monitor.
 *  const workshop = Grid.frame(Grid.gerstner, { fit: 'Fixed', size: 24, margin: 1 })
 *  ``` */
export const frame = (
  grid: Grid<number, number>,
  options: Readonly<{ fit: Fit; margin?: number; min?: number; size?: Value }>,
): Frame => {
  const margin = options.margin ?? 1
  const min = options.min ?? 0
  if (!Number.isInteger(margin) || margin < 0) {
    throw new Error(
      `[pleat] A frame's margin must be a whole number of units, not ${margin}.`,
    )
  }
  if (options.fit === 'Fixed' && options.size === undefined) {
    throw new Error('[pleat] A Fixed frame needs a size: a length, or a token for one.')
  }
  const unit = grid.unit.reference
  const declarations = (units: number, unitValue: string): Declarations => ({
    [grid.unit.name]: unitValue,
    gridTemplateColumns: `repeat(${units}, ${unit})`,
    inlineSize: `calc(${units} * ${unit})`,
  })
  const own =
    options.fit === 'Fixed'
      ? lengthOf(options.size ?? 0)
      : fluidUnit(options.fit, grid.units + 2 * margin, min)
  const field = Style.make({
    ...declarations(grid.units, own),
    boxSizing: 'content-box',
    position: 'relative',
    display: 'grid',
    gridAutoRows: unit,
    marginInline: 'auto',
    paddingBlock: `calc(${margin} * ${unit})`,
  })
  const { half } = grid
  return {
    _tag: 'Frame',
    fit: options.fit,
    margin,
    min,
    size: options.size,
    host:
      options.fit === 'Fixed'
        ? Style.make({ overflowX: 'auto' })
        : Style.make({ containerType: 'inline-size', containerName: grid.name }),
    field:
      half === undefined || !isHalfFrame(options.fit)
        ? field
        : Style.when(field, isHalf(grid), {
            ...declarations(
              half.units,
              fluidUnit(options.fit, half.units + 2 * margin, min),
            ),
            gridAutoRows: 'auto',
          }),
  }
}

// FITTING

/** A frame fitted to a width: the unit in pixels, how many units across, whether that is the
 *  half, and the margin on each side. */
export type Fitted = Readonly<{
  unit: number
  units: number
  isHalf: boolean
  margin: number
}>

/** What `frame` does with `width` pixels of host, computed the way the browser does it. A
 *  `Fixed` frame whose size is a token needs `size`, the token's value in pixels.
 *
 *  ```ts
 *  Grid.fit(Grid.gerstner, stage, 1440) // { unit: 24, units: 58, isHalf: false, margin: 24 }
 *  Grid.fit(Grid.gerstner, stage, 393) // { unit: 13, units: 28, isHalf: true, margin: 14.5 }
 *  ``` */
export const fit = (
  grid: Grid<number, number>,
  frame: Frame,
  width: number,
  options: Readonly<{ size?: number }> = {},
): Fitted => {
  if (frame.fit === 'Fixed') {
    const size = options.size ?? (typeof frame.size === 'number' ? frame.size : undefined)
    if (size === undefined) {
      throw new Error(
        '[pleat] Grid.fit needs the size of a Fixed frame whose unit is a token.',
      )
    }
    return {
      unit: size,
      units: grid.units,
      isHalf: false,
      margin: (width - grid.units * size) / 2,
    }
  }
  const isNarrow = grid.half !== undefined && width < grid.half.below
  const units = isNarrow && grid.half !== undefined ? grid.half.units : grid.units
  const unit = Math.max(frame.min, Math.floor(width / (units + 2 * frame.margin)))
  return { unit, units, isHalf: isNarrow, margin: (width - units * unit) / 2 }
}

/** Where `area` sits in a fitted field, in pixels from the field's top left corner. */
export const resolve = (
  fitted: Fitted,
  area: Area,
): Readonly<{ x: number; y: number; width: number; height: number }> => ({
  x: (area.col - 1) * fitted.unit,
  y: ((area.row ?? 1) - 1) * fitted.unit,
  width: area.span * fitted.unit,
  height: (area.rows ?? 1) * fitted.unit,
})

// PLACEMENT

const checkArea = (units: number, area: Area): Area => {
  assertWhole(area.col, 'A column')
  assertWhole(area.span, 'A span')
  if (area.col + area.span - 1 > units) {
    throw new Error(
      `[pleat] Columns ${area.col} to ${area.col + area.span - 1} run past a ${units}-unit grid.`,
    )
  }
  if (area.row !== undefined) {
    assertWhole(area.row, 'A row')
  }
  if (area.rows !== undefined) {
    assertWhole(area.rows, 'A row count')
  }
  return area
}

/** Every column of an `of`-column split, first to last, ready to place.
 *
 *  ```ts
 *  Grid.split(Grid.gerstner, 3).map(column => Grid.column(Grid.gerstner, column))
 *  ``` */
export const split = <Columns extends number, Of extends Columns>(
  grid: Grid<Columns, number>,
  of: Of,
): ReadonlyArray<Column<Of>> => {
  assertExact(grid.units, grid.gutter, [of])
  return Array.from({ length: of }, (_, index) => ({ of, at: (index + 1) as Index<Of> }))
}

/** The area of column `at` of `of` equal columns, spanning `span` of them, in units. */
export const area = <Of extends number>(
  grid: Readonly<{ units: number; gutter: number }>,
  column: Column<Of>,
): Area => {
  const { units, gutter } = grid
  const span = column.span ?? 1
  if (!isExact(units, gutter, column.of)) {
    throw new Error(
      `[pleat] ${units} units don't divide into ${column.of} equal columns.`,
    )
  }
  if (!Number.isInteger(column.at) || column.at < 1 || column.at + span - 1 > column.of) {
    throw new Error(
      `[pleat] Column ${column.at} spanning ${span} doesn't fit in ${column.of} columns.`,
    )
  }
  const width = (units - gutter * (column.of - 1)) / column.of
  return checkArea(units, {
    col: (column.at - 1) * (width + gutter) + 1,
    span: span * width + (span - 1) * gutter,
    ...(column.row === undefined ? {} : { row: column.row }),
    ...(column.rows === undefined ? {} : { rows: column.rows }),
  })
}

const areaDeclarations = (area: Area): Declarations => ({
  gridColumn: `${area.col} / span ${area.span}`,
  ...(area.row === undefined ? {} : { gridRow: `${area.row} / span ${area.rows ?? 1}` }),
  ...(area.row === undefined && area.rows !== undefined
    ? { gridRow: `span ${area.rows}` }
    : {}),
})

/** Places a block on `grid` by units. On the half it fills the width and its rows follow its
 *  content, unless `half` says where it goes there.
 *
 *  ```ts
 *  const hero = Grid.place(Grid.gerstner, { col: 3, span: 54, row: 2, rows: 8 })
 *  ``` */
export const place = <HalfColumns extends number>(
  grid: Grid<number, HalfColumns>,
  at: Area,
  options: Readonly<{ half?: Area | Column<NoInfer<HalfColumns>> }> = {},
): Style.Style => {
  const base = Style.make({
    ...areaDeclarations(checkArea(grid.units, at)),
    minInlineSize: 0,
  })
  const { half } = grid
  if (half === undefined) {
    return base
  }
  const onHalf =
    options.half === undefined
      ? { gridColumn: '1 / -1', gridRow: 'auto' }
      : {
          gridRow: 'auto',
          ...areaDeclarations(
            'of' in options.half
              ? area({ units: half.units, gutter: grid.gutter }, options.half)
              : checkArea(half.units, options.half),
          ),
        }
  return Style.when(base, isHalf(grid), onHalf)
}

/** Places a block on column `at` of `of` equal columns, spanning `span` of them. Only the
 *  grid's exact column counts type-check, and only columns that exist in them.
 *
 *  ```ts
 *  const log = Grid.column(Grid.gerstner, { of: 3, at: 1 }) // units 1 to 18
 *  const sheet = Grid.column(Grid.gerstner, { of: 3, at: 2, span: 2 }) // units 21 to 58
 *  const note = Grid.column(Grid.gerstner, { of: 3, at: 3 }, { half: { of: 2, at: 2 } })
 *  ``` */
export const column = <
  Columns extends number,
  HalfColumns extends number,
  Of extends Columns,
>(
  grid: Grid<Columns, HalfColumns>,
  at: Column<Of>,
  options: Readonly<{ half?: Area | Column<NoInfer<HalfColumns>> }> = {},
): Style.Style => place(grid, area(grid, at), options)

/** Lays an element's children in `of` equal columns of the grid, with its gutters, for a
 *  block that spans the whole field. */
export const modules = <Columns extends number>(
  grid: Grid<Columns, number>,
  of: Columns,
): Style.Style => {
  const width = (grid.units - grid.gutter * (of - 1)) / of
  return Style.make({
    display: 'grid',
    gridTemplateColumns: `repeat(${of}, ${units(grid, width)})`,
    columnGap: units(grid, grid.gutter),
  })
}

// TYPE

/** A type size and its leading, in units: a size of any multiple, a leading in quarter units.
 *  `half` gives the size on the half, where a unit is about half as big. */
export type Text = Readonly<{
  size: number
  leading: Quarter
  half?: Readonly<{ size: number; leading: Quarter }>
}>

const QUARTERS = (value: number): boolean => Number.isInteger(value * 4) && value > 0

const textDeclarations = (
  grid: Grid<number, number>,
  text: Readonly<{ size: number; leading: number }>,
  min: number,
): Declarations => {
  if (!(text.size > 0) || !QUARTERS(text.leading)) {
    throw new Error(
      `[pleat] Type needs a positive size and a leading in quarter units, not ${text.size} / ${text.leading}.`,
    )
  }
  return {
    fontSize: `max(${min}px, calc(${text.size} * ${grid.unit.reference}))`,
    lineHeight: `calc(${text.leading} * ${grid.unit.reference})`,
  }
}

/** A type size and leading measured in units, so text follows the frame and every line ends
 *  on a quarter unit. Sizes never go below `min` pixels (default 12). */
export const text = (
  grid: Grid<number, number>,
  value: Text,
  options: Readonly<{ min?: number }> = {},
): Style.Style => {
  const min = options.min ?? 12
  const base = Style.make(textDeclarations(grid, value, min))
  return value.half === undefined || grid.half === undefined
    ? base
    : Style.when(base, isHalf(grid), textDeclarations(grid, value.half, min))
}

/** A type scale made by {@link type}: a Recipe whose one dimension is `role`. */
export type Scale<Role extends string> = Recipe.Recipe<{ readonly role: Role }, {}>

/** A type scale on the grid as a Recipe with one dimension, `role`.
 *
 *  ```ts
 *  const type = Grid.type(Grid.gerstner, {
 *    Mono: { size: 0.5, leading: 0.75, half: { size: 1, leading: 1.5 } },
 *    Read: { size: 5 / 6, leading: 1.25, half: { size: 1.25, leading: 2 } },
 *  })
 *  h.p([...css(type({ role: 'Read' }))], [text])
 *  ``` */
export const type = <const Roles extends Readonly<Record<string, Text>>>(
  grid: Grid<number, number>,
  roles: Roles,
  options: Readonly<{ min?: number }> = {},
): Scale<keyof Roles & string> => {
  const variants: Readonly<Record<string, Style.Style>> = Object.fromEntries(
    Object.entries(roles).map(([role, value]) => [role, text(grid, value, options)]),
  )
  // NOTE: the options are exactly the keys of `roles`, which Recipe's types
  // can't see through Object.fromEntries.
  return Recipe.make({ name: 'Type', variants: { role: variants } }) as unknown as Scale<
    keyof Roles & string
  >
}
