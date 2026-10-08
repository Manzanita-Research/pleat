// PROPERTY NAMES

const VENDOR_PREFIX = /^(Webkit|Moz|ms|O)(?=[A-Z])/
const UPPERCASE = /[A-Z]/g
const CAMEL_PROPERTY = /^[A-Za-z][A-Za-z0-9]*$/
const CUSTOM_PROPERTY = /^--[A-Za-z0-9_-]+$/

/** Whether `name` is a CSS custom property such as `--color-ink`. */
export const isCustomProperty = (name: string): boolean => CUSTOM_PROPERTY.test(name)

/** Whether `name` can be written as one declaration: camelCase or `--custom`. */
export const isValidPropertyName = (name: string): boolean =>
  isCustomProperty(name) || CAMEL_PROPERTY.test(name)

/** `backgroundColor` → `background-color`, `WebkitLineClamp` → `-webkit-line-clamp`. */
export const toKebabCase = (name: string): string => {
  if (name.startsWith('--')) {
    return name
  }
  if (name === 'cssFloat') {
    return 'float'
  }
  const vendorMatch = VENDOR_PREFIX.exec(name)
  const kebab = name.replace(UPPERCASE, letter => `-${letter.toLowerCase()}`)
  return vendorMatch === null ? kebab : `-${kebab.replace(/^-/, '')}`
}

// VALUES

const UNITLESS_PROPERTIES: ReadonlySet<string> = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'columnCount',
  'columns',
  'fillOpacity',
  'flex',
  'flexGrow',
  'flexShrink',
  'floodOpacity',
  'fontSizeAdjust',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'lineClamp',
  'WebkitLineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
])

/** Formats a number the way inline styles in most view libraries do: `px` unless unitless. */
export const formatNumber = (property: string, value: number): string =>
  value === 0 || UNITLESS_PROPERTIES.has(property) || isCustomProperty(property)
    ? String(value)
    : `${value}px`

/** Whether a declaration value is safe to place inside a rule or a `style` attribute.
 *
 * Rejects anything that could end the declaration or the rule early (`;`, `{`, `}` outside
 * quotes), comments, unbalanced quotes or parentheses, and `<` outside quotes, which keeps a
 * value from closing a server-rendered `<style>` element. */
export const isSafeValue = (value: string): boolean => {
  let quote: string | undefined
  let depth = 0
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index)
    if (quote !== undefined) {
      if (character === '\\') {
        index += 1
      } else if (character === quote) {
        quote = undefined
      } else if (character === '\n' || character === '<') {
        return false
      }
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
    } else if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
      if (depth < 0) {
        return false
      }
    } else if (
      character === ';' ||
      character === '{' ||
      character === '}' ||
      character === '<' ||
      character === '!' ||
      character === '\\'
    ) {
      return false
    } else if (character === '/' && value.charAt(index + 1) === '*') {
      return false
    }
  }
  return quote === undefined && depth === 0 && value.trim() !== ''
}

// SHORTHANDS

const sides = (prefix: string, suffix = ''): ReadonlyArray<string> => [
  `${prefix}Top${suffix}`,
  `${prefix}Right${suffix}`,
  `${prefix}Bottom${suffix}`,
  `${prefix}Left${suffix}`,
]

const logicalPair = (
  prefix: string,
  axis: 'Block' | 'Inline',
  suffix = '',
): ReadonlyArray<string> => [
  `${prefix}${axis}Start${suffix}`,
  `${prefix}${axis}End${suffix}`,
]

const BORDER_SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const
const BORDER_ASPECTS = ['Width', 'Style', 'Color'] as const
const LOGICAL_SIDES = ['BlockStart', 'BlockEnd', 'InlineStart', 'InlineEnd'] as const

const borderEntries = (): ReadonlyArray<readonly [string, ReadonlyArray<string>]> => [
  ['border', [...BORDER_SIDES.map(side => `border${side}`), 'borderImage']],
  ...BORDER_SIDES.map(
    side =>
      [`border${side}`, BORDER_ASPECTS.map(aspect => `border${side}${aspect}`)] as const,
  ),
  ...BORDER_ASPECTS.map(
    aspect =>
      [`border${aspect}`, BORDER_SIDES.map(side => `border${side}${aspect}`)] as const,
  ),
  ['borderBlock', ['borderBlockStart', 'borderBlockEnd']],
  ['borderInline', ['borderInlineStart', 'borderInlineEnd']],
  ...LOGICAL_SIDES.map(
    side =>
      [`border${side}`, BORDER_ASPECTS.map(aspect => `border${side}${aspect}`)] as const,
  ),
  ...(['Block', 'Inline'] as const).flatMap(axis =>
    BORDER_ASPECTS.map(
      aspect =>
        [
          `border${axis}${aspect}`,
          [`border${axis}Start${aspect}`, `border${axis}End${aspect}`],
        ] as const,
    ),
  ),
  [
    'borderRadius',
    [
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomRightRadius',
      'borderBottomLeftRadius',
    ],
  ],
  [
    'borderImage',
    [
      'borderImageSource',
      'borderImageSlice',
      'borderImageWidth',
      'borderImageOutset',
      'borderImageRepeat',
    ],
  ],
]

// NOTE: each entry lists what a shorthand resets directly. Nesting (border →
// borderTop → borderTopColor) is resolved by `leavesOf`. Logical and physical
// properties are separate families, as they are in the CSS cascade's own
// bookkeeping; mixing them on one box side resolves by property priority.
const SHORTHAND_ENTRIES: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  [
    'animation',
    [
      'animationName',
      'animationDuration',
      'animationTimingFunction',
      'animationDelay',
      'animationIterationCount',
      'animationDirection',
      'animationFillMode',
      'animationPlayState',
    ],
  ],
  [
    'background',
    [
      'backgroundColor',
      'backgroundImage',
      'backgroundPosition',
      'backgroundSize',
      'backgroundRepeat',
      'backgroundAttachment',
      'backgroundOrigin',
      'backgroundClip',
    ],
  ],
  ['backgroundPosition', ['backgroundPositionX', 'backgroundPositionY']],
  ...borderEntries(),
  ['columnRule', ['columnRuleWidth', 'columnRuleStyle', 'columnRuleColor']],
  ['columns', ['columnWidth', 'columnCount']],
  ['containIntrinsicSize', ['containIntrinsicWidth', 'containIntrinsicHeight']],
  ['container', ['containerName', 'containerType']],
  ['flex', ['flexGrow', 'flexShrink', 'flexBasis']],
  ['flexFlow', ['flexDirection', 'flexWrap']],
  [
    'font',
    [
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontStretch',
      'fontSize',
      'lineHeight',
      'fontFamily',
    ],
  ],
  ['gap', ['rowGap', 'columnGap']],
  ['grid', ['gridTemplate', 'gridAutoRows', 'gridAutoColumns', 'gridAutoFlow']],
  ['gridTemplate', ['gridTemplateRows', 'gridTemplateColumns', 'gridTemplateAreas']],
  ['gridArea', ['gridRow', 'gridColumn']],
  ['gridRow', ['gridRowStart', 'gridRowEnd']],
  ['gridColumn', ['gridColumnStart', 'gridColumnEnd']],
  ['inset', ['top', 'right', 'bottom', 'left']],
  ['insetBlock', ['insetBlockStart', 'insetBlockEnd']],
  ['insetInline', ['insetInlineStart', 'insetInlineEnd']],
  ['listStyle', ['listStyleType', 'listStylePosition', 'listStyleImage']],
  ['margin', sides('margin')],
  ['marginBlock', logicalPair('margin', 'Block')],
  ['marginInline', logicalPair('margin', 'Inline')],
  [
    'mask',
    [
      'maskImage',
      'maskMode',
      'maskPosition',
      'maskSize',
      'maskRepeat',
      'maskOrigin',
      'maskClip',
      'maskComposite',
    ],
  ],
  ['outline', ['outlineColor', 'outlineStyle', 'outlineWidth']],
  ['overflow', ['overflowX', 'overflowY']],
  ['padding', sides('padding')],
  ['paddingBlock', logicalPair('padding', 'Block')],
  ['paddingInline', logicalPair('padding', 'Inline')],
  ['placeContent', ['alignContent', 'justifyContent']],
  ['placeItems', ['alignItems', 'justifyItems']],
  ['placeSelf', ['alignSelf', 'justifySelf']],
  ['scrollMargin', sides('scrollMargin')],
  ['scrollPadding', sides('scrollPadding')],
  [
    'textDecoration',
    [
      'textDecorationLine',
      'textDecorationStyle',
      'textDecorationColor',
      'textDecorationThickness',
    ],
  ],
  ['textEmphasis', ['textEmphasisStyle', 'textEmphasisColor']],
  [
    'transition',
    [
      'transitionProperty',
      'transitionDuration',
      'transitionTimingFunction',
      'transitionDelay',
      'transitionBehavior',
    ],
  ],
]

const SHORTHANDS: ReadonlyMap<string, ReadonlyArray<string>> = new Map(SHORTHAND_ENTRIES)

const leavesCache = new Map<string, ReadonlySet<string>>()

/** The longhand properties `property` sets. A longhand's only leaf is itself. */
export const leavesOf = (property: string): ReadonlySet<string> => {
  const cached = leavesCache.get(property)
  if (cached !== undefined) {
    return cached
  }
  const children = SHORTHANDS.get(property)
  const leaves: ReadonlySet<string> =
    children === undefined
      ? new Set([property])
      : new Set(children.flatMap(child => [...leavesOf(child)]))
  leavesCache.set(property, leaves)
  return leaves
}

const heightCache = new Map<string, number>()

const heightOf = (property: string): number => {
  const cached = heightCache.get(property)
  if (cached !== undefined) {
    return cached
  }
  const children = SHORTHANDS.get(property)
  const height =
    children === undefined ? 0 : 1 + Math.max(...children.map(child => heightOf(child)))
  heightCache.set(property, height)
  return height
}

const MAX_PROPERTY_PRIORITY = 3

/** Where a property's rules sit among rules for the same condition. Longhands come last so
 *  that a longhand written after its shorthand wins, as it would in an inline style. */
export const propertyPriority = (property: string): number =>
  property === 'all' ? 0 : Math.max(1, MAX_PROPERTY_PRIORITY - heightOf(property))

const isSubset = (inner: ReadonlySet<string>, outer: ReadonlySet<string>): boolean => {
  for (const leaf of inner) {
    if (!outer.has(leaf)) {
      return false
    }
  }
  return true
}

/** Whether writing `later` after `earlier` (under the same condition) makes `earlier` irrelevant. */
export const shadows = (later: string, earlier: string): boolean =>
  later === earlier || isSubset(leavesOf(earlier), leavesOf(later))

/** Whether two properties set some of the same longhands without one containing the other.
 *  `borderTop` and `borderColor` overlap this way. Their relative order cannot be preserved
 *  by atomic rules, so Pleat reports it in development. */
export const overlapsPartially = (left: string, right: string): boolean => {
  if (left === right) {
    return false
  }
  const leftLeaves = leavesOf(left)
  const rightLeaves = leavesOf(right)
  if (isSubset(leftLeaves, rightLeaves) || isSubset(rightLeaves, leftLeaves)) {
    return false
  }
  for (const leaf of leftLeaves) {
    if (rightLeaves.has(leaf)) {
      return true
    }
  }
  return false
}
