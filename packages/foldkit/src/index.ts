/** Pleat styles in Foldkit views.
 *
 *  ```ts
 *  import { css } from '@pleat/foldkit'
 *
 *  h.button([...attributes.button, ...css(button({ tone: 'Primary' }))], ['Save'])
 *  ```
 *
 *  @packageDocumentation */

import { Style, Var } from '@pleat/core'
import { type Attribute, inertHtml } from 'foldkit/html'

// PARTS

/** A plain class name passed through untouched, for CSS Pleat doesn't own (a Tailwind
 *  utility, a third-party widget's class). */
export interface ClassName {
  readonly _tag: 'ClassName'
  readonly value: string
}

const CLASS_TOKEN = /^-?[_a-zA-Z][_a-zA-Z0-9-:/[\].%]*$/

/** Wraps class names Pleat doesn't own so {@link css} can put them on the element too. */
export const className = (value: string): ClassName => {
  const tokens = value.split(/\s+/).filter(token => token !== '')
  for (const token of tokens) {
    if (!CLASS_TOKEN.test(token)) {
      throw new Error(`[pleat] ${JSON.stringify(token)} is not a class name.`)
    }
  }
  return { _tag: 'ClassName', value: tokens.join(' ') }
}

/** Anything {@link css} accepts. */
export type Part = Style.Style | Var.Binding | ClassName

const isClassName = (part: Part): part is ClassName =>
  '_tag' in part && part._tag === 'ClassName'

// ATTRIBUTES

const NO_ATTRIBUTES: ReadonlyArray<Attribute<never>> = Object.freeze([])

const attributesByStyle = new WeakMap<Style.Style, ReadonlyArray<Attribute<never>>>()

const attributesFor = (style: Style.Style): ReadonlyArray<Attribute<never>> => {
  const cached = attributesByStyle.get(style)
  if (cached !== undefined) {
    return cached
  }
  const className = Style.use(style)
  const attributes =
    className === '' ? NO_ATTRIBUTES : Object.freeze([inertHtml.Class(className)])
  attributesByStyle.set(style, attributes)
  return attributes
}

/** The attributes that apply Pleat styles to an element: one `Class` with every style's
 *  atoms, merged left to right, and one `Style` with every variable binding. Spread them
 *  into the element's attributes.
 *
 *  Foldkit keeps only the last `Class` and the last `Style` an element is given, so pass
 *  everything to one `css` call rather than spreading several.
 *
 *  For a single style, or styles already merged before, the result is cached and the call
 *  allocates nothing. The first use of a style in a browser inserts its rules.
 *
 *  ```ts
 *  h.div([...css(card, isSelected ? selectedRing : Style.empty)], children)
 *  h.div([...css(progressBar, Var.bind(progress, model.percent))])
 *  ``` */
export const css = (...parts: ReadonlyArray<Part>): ReadonlyArray<Attribute<never>> => {
  if (parts.length === 1) {
    const [only] = parts
    if (only !== undefined && Style.isStyle(only)) {
      return attributesFor(only)
    }
  }

  let style = Style.empty
  let extraClasses = ''
  let bindings: Record<string, string> | undefined
  for (const part of parts) {
    if (Style.isStyle(part)) {
      style = Style.merge(style, part)
    } else if (Var.isBinding(part)) {
      bindings ??= {}
      bindings[part.name] = part.value
    } else if (isClassName(part)) {
      extraClasses = extraClasses === '' ? part.value : `${extraClasses} ${part.value}`
    }
  }

  if (bindings === undefined && extraClasses === '') {
    return attributesFor(style)
  }

  const styleClasses = Style.use(style)
  const classes =
    styleClasses === ''
      ? extraClasses
      : extraClasses === ''
        ? styleClasses
        : `${styleClasses} ${extraClasses}`
  const attributes: Array<Attribute<never>> = []
  if (classes !== '') {
    attributes.push(inertHtml.Class(classes))
  }
  if (bindings !== undefined) {
    attributes.push(inertHtml.Style(bindings))
  }
  return attributes
}
