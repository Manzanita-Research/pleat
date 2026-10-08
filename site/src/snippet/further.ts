import { Calc, Color, Recipe, Style } from '@pleat/core'
import { Option } from 'effect'

// The same transforms as 2017. They now compile to CSS functions.
const bumpFontSize = Style.evolve({
  fontSize: size => Calc.add(size, 4),
})
const darkenText = Style.evolve({
  color: color => Color.darken(color, 0.1),
})
const brandify = Style.merge(
  Style.make({ fontFamily: '"Circular Air Pro"' }),
)
const boxShadow = Style.make({
  boxShadow: '0 2px 3px rgb(0 0 0 / 0.25)',
})

// 2017's chain read props at render time. Here the outline is
// derived from the style where it is defined, and props only pick a
// finished branch.
const outlineify = (style: Style.Style) =>
  Style.make({
    border: '1px solid currentColor',
    backgroundColor: 'transparent',
    color: Option.getOrElse(
      Style.get(style, 'backgroundColor'),
      () => 'inherit',
    ),
  })

const primary = Style.make({ backgroundColor: 'green' })
const secondary = Style.make({ backgroundColor: 'blue' })

export const myButton = Recipe.make({
  base: Style.make({
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  }).pipe(
    bumpFontSize,
    darkenText,
    brandify,
    Style.merge(boxShadow),
  ),
  variants: {
    isPrimary: { true: primary, false: secondary },
    isOutline: { true: {}, false: {} },
  },
  defaults: { isPrimary: false, isOutline: false },
  compounds: [
    {
      when: { isPrimary: true, isOutline: true },
      style: outlineify(primary),
    },
    {
      when: { isPrimary: false, isOutline: true },
      style: outlineify(secondary),
    },
  ],
})

myButton({ isPrimary: false, isOutline: true })
