import { Stream } from 'effect'
import { streamFromKeyBindings } from 'foldkit/dom'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Grid, Style } from '@pleat/core'

// NOTE: hairlines are backgrounds, never borders, so showing the grid moves
// nothing on the page.
const ink = (percent: number): string =>
  `color-mix(in srgb, currentColor ${percent}%, transparent)`

const lines = (unit: string): string =>
  [
    `repeating-linear-gradient(to right, ${ink(9)} 0 1px, transparent 1px ${unit})`,
    `repeating-linear-gradient(to bottom, ${ink(12)} 0 1px, transparent 1px ${unit})`,
  ].join(', ')

type Styles = Readonly<{
  overlay: Style.Style
  hidden: Style.Style
  ruler: Style.Style
  number: Style.Style
  beyondHalf: Style.Style
  tracks: Style.Style
  halfTracks: Style.Style
  track: Style.Style
}>

const stylesByGrid = new WeakMap<Grid.Grid<number, number>, Map<number, Styles>>()

// NOTE: a class attribute only, since nothing here binds a variable; using
// Style directly keeps this module free of the adapter's entry point.
const classOf = <Message>(
  h: HtmlBuilder<Message>,
  ...styles: ReadonlyArray<Style.Style>
) => h.Class(Style.use(Style.mergeAll(styles)))

const stylesFor = (grid: Grid.Grid<number, number>, of: number): Styles => {
  const byColumns = stylesByGrid.get(grid) ?? new Map<number, Styles>()
  stylesByGrid.set(grid, byColumns)
  const cached = byColumns.get(of)
  if (cached !== undefined) {
    return cached
  }
  const unit = grid.unit.reference
  const half = grid.half
  const onHalf = Grid.isHalf(grid)
  const styles: Styles = {
    overlay: Style.make({
      position: 'absolute',
      zIndex: 30,
      inset: 0,
      marginInline: 'auto',
      inlineSize: Grid.units(grid, grid.units),
      pointerEvents: 'none',
      backgroundImage: lines(unit),
    }).pipe(
      Style.when(onHalf, { inlineSize: Grid.units(grid, half?.units ?? grid.units) }),
    ),
    hidden: Style.make({ display: 'none' }),
    ruler: Style.make({
      display: 'grid',
      gridTemplateColumns: `repeat(${grid.units}, ${unit})`,
      blockSize: unit,
    }).pipe(
      Style.when(onHalf, {
        gridTemplateColumns: `repeat(${half?.units ?? grid.units}, ${unit})`,
      }),
    ),
    number: Style.make({
      display: 'grid',
      placeItems: 'center',
      fontSize: `max(8px, calc(0.375 * ${unit}))`,
      fontVariantNumeric: 'tabular-nums',
      color: ink(70),
    }),
    beyondHalf: Style.empty.pipe(Style.when(onHalf, { display: 'none' })),
    tracks: Style.merge(
      Grid.modules(grid, of),
      Style.make({ position: 'absolute', inset: 0 }),
    ).pipe(Style.when(onHalf, { display: 'none' })),
    halfTracks:
      half === undefined
        ? Style.make({ display: 'none' })
        : Style.make({
            display: 'none',
            position: 'absolute',
            inset: 0,
            gridTemplateColumns: `repeat(${half.columns.at(-1) ?? 2}, ${Grid.units(
              grid,
              (half.units - grid.gutter * ((half.columns.at(-1) ?? 2) - 1)) /
                (half.columns.at(-1) ?? 2),
            )})`,
            columnGap: Grid.units(grid, grid.gutter),
          }).pipe(Style.when(onHalf, { display: 'grid' })),
    track: Style.make({
      backgroundColor: ink(6),
      boxShadow: `inset 1px 0 ${ink(40)}, inset -1px 0 ${ink(40)}`,
    }),
  }
  byColumns.set(of, styles)
  return styles
}

/** The grid drawn over its field: unit lines, baselines, the numbered ruler, and the tracks
 *  of `of` columns, or of the half's widest split on a narrow screen. Put it first in the
 *  element that has the frame's `field` style. It takes no space and catches no pointer.
 *
 *  ```ts
 *  h.div([...css(frame.field)], [
 *    gridOverlay(Grid.gerstner, h, { isShown: model.isGridShown, of: 6 }),
 *    ...blocks,
 *  ])
 *  ``` */
export const gridOverlay = <Message, Columns extends number>(
  grid: Grid.Grid<Columns, number>,
  h: HtmlBuilder<Message>,
  options: Readonly<{ isShown: boolean; of?: Columns }>,
): Html => {
  const of = options.of ?? grid.columns.at(-1) ?? 1
  const styles = stylesFor(grid, of)
  const halfOf = grid.half?.columns.at(-1) ?? 0
  return h.div(
    [
      h.AriaHidden(true),
      classOf(h, styles.overlay, ...(options.isShown ? [] : [styles.hidden])),
    ],
    [
      h.div(
        [classOf(h, styles.ruler)],
        Array.from({ length: grid.units }, (_, index) =>
          h.span(
            [
              classOf(
                h,
                styles.number,
                ...(index >= (grid.half?.units ?? grid.units) ? [styles.beyondHalf] : []),
              ),
            ],
            [String(index + 1)],
          ),
        ),
      ),
      h.div(
        [classOf(h, styles.tracks)],
        Array.from({ length: of }, () => h.span([classOf(h, styles.track)])),
      ),
      h.div(
        [classOf(h, styles.halfTracks)],
        Array.from({ length: halfOf }, () => h.span([classOf(h, styles.track)])),
      ),
    ],
  )
}

/** A Stream that sends `message` each time the G key is pressed outside a text field, for
 *  showing and hiding {@link gridOverlay}. It's a plain Stream, so it fits any Subscription
 *  API: wrap it in `persistentEntry` on Foldkit 0.167, or return it from a Block's
 *  `Definition.subscriptions` handler.
 *
 *  ```ts
 *  export const subscriptions = Subscription.make<Model, Message>()(() => ({
 *    gridKey: persistentEntry(gridKey(Message.PressedGridKey())),
 *  }))
 *  ``` */
export const gridKey = <Message>(
  message: Message,
  options: Readonly<{ key?: string }> = {},
): Stream.Stream<Message> =>
  Stream.suspend(() =>
    streamFromKeyBindings({
      bindings: [
        { keys: options.key ?? 'g', mapEvent: () => message, whileTyping: 'Suppress' },
      ],
    }),
  )
