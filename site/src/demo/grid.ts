import { Grid, type Style } from '@pleat/core'

// Gerstner's 58: 2-unit gutters, exact in 2 to 6 columns, and a
// 28-unit half below 640px.
export const grid = Grid.gerstner

// The frame fills its container. The unit is a whole pixel:
// floor(width / 60), with the remainder split between the sides.
export const frame = Grid.frame(grid, {
  fit: 'Container',
  margin: 1,
})

// Every split, one band each, two rows tall with a row between.
// On the half, a block fills the width unless it says otherwise.
export const bands: ReadonlyArray<
  ReadonlyArray<Readonly<{ area: Grid.Area; style: Style.Style }>>
> = grid.columns.map((of, band) =>
  Grid.split(grid, of).map(column => {
    const placed = { ...column, row: 1 + band * 3, rows: 2 }
    return {
      area: Grid.area(grid, placed),
      style: Grid.column(grid, placed),
    }
  }),
)

// This one says otherwise: the last of three columns, and the
// second of two on the half.
export const note: Style.Style = Grid.column(
  grid,
  { of: 3, at: 3, row: 16, rows: 3 },
  { half: { of: 2, at: 2 } },
)

// Type in units: sizes fit the face, leadings land on quarters,
// and the half has its own steps.
export const type = Grid.type(grid, {
  Mono: {
    size: 0.5,
    leading: 0.75,
    half: { size: 1, leading: 1.5 },
  },
  Ui: { size: 0.625, leading: 1, half: { size: 1.25, leading: 2 } },
  Head: {
    size: 1.5,
    leading: 1.5,
    half: { size: 1.75, leading: 2 },
  },
})
