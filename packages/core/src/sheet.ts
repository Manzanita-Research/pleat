import { propertyPriority } from './property.ts'
import * as When from './when.ts'

// ATOMS

/** One declaration under one condition, compiled to one class and at most one rule.
 *  A marker atom contributes a class and no rule. */
export interface Atom {
  readonly _tag: 'Declaration' | 'Marker'
  /** Canonical identity: the condition, property, and value. */
  readonly key: string
  readonly condition: When.Condition
  /** camelCase or `--custom`. Empty for markers. */
  readonly property: string
  readonly value: string
  readonly className: string
  /** Atoms in one slot replace each other: `${condition.key}|${property}`. */
  readonly slot: string
  readonly priority: number
  /** The rule text. Empty for markers. */
  readonly rule: string
}

/** Orders atoms the way the stylesheet emits them: by condition precedence, then by
 *  property priority so a longhand beats its shorthand under the same condition. */
export const compareAtoms = (left: Atom, right: Atom): number => {
  const byCondition = When.compare(left.condition, right.condition)
  if (byCondition !== 0) {
    return byCondition
  }
  if (left.priority !== right.priority) {
    return left.priority - right.priority
  }
  return left.className < right.className ? -1 : left.className > right.className ? 1 : 0
}

// REGISTRY

const atomsByClassName = new Map<string, Atom>()
const globalsById = new Map<string, Global>()
let version = 0

/** A rule outside the atomic layer: a theme, a keyframes block, a font face, an element rule. */
export interface Global {
  readonly id: string
  readonly layer: 'globals' | 'themes'
  readonly rule: string
}

/** @internal Registers an atom, returning the canonical instance for its class. */
export const registerAtom = (atom: Atom): Atom => {
  const existing = atomsByClassName.get(atom.className)
  if (existing !== undefined) {
    if (existing.key !== atom.key) {
      throw new Error(
        `[pleat] Class ${atom.className} was computed for two different declarations, ` +
          `${JSON.stringify(existing.key)} and ${JSON.stringify(atom.key)}. ` +
          'This is a hash collision; please report it.',
      )
    }
    return existing
  }
  atomsByClassName.set(atom.className, atom)
  version += 1
  return atom
}

/** @internal Builds a declaration atom. */
export const makeAtom = (
  condition: When.Condition,
  property: string,
  value: string,
  className: string,
  body: string,
): Atom => ({
  _tag: 'Declaration',
  key: `${condition.key}{${property}:${value}}`,
  condition,
  property,
  value,
  className,
  slot: `${condition.key}|${property}`,
  priority: propertyPriority(property),
  rule: When.renderRule(condition, className, body),
})

/** @internal Registers a global rule. Registering the same id again replaces its text, in
 *  the same position, in the browser too. */
export const registerGlobal = (global: Global): void => {
  const existing = globalsById.get(global.id)
  if (existing !== undefined && existing.rule === global.rule) {
    return
  }
  globalsById.set(global.id, global)
  version += 1
  if (mounted !== undefined) {
    insertGlobal(mounted, global)
  }
}

// RENDERING

const LAYER_ORDER = '@layer pleat.globals, pleat.themes, pleat.atoms;'

let sortedCache: Readonly<{ version: number; atoms: ReadonlyArray<Atom> }> = {
  version: -1,
  atoms: [],
}

const sortedAtoms = (): ReadonlyArray<Atom> => {
  if (sortedCache.version !== version) {
    sortedCache = {
      version,
      atoms: [...atomsByClassName.values()]
        .filter(atom => atom._tag === 'Declaration')
        .sort(compareAtoms),
    }
  }
  return sortedCache.atoms
}

const globalsIn = (layer: Global['layer']): string =>
  [...globalsById.values()]
    .filter(global => global.layer === layer)
    .map(global => global.rule)
    .join('')

/** Options for {@link render}. */
export type RenderOptions = Readonly<{
  /** Only emit atoms for these classes. Globals and themes are always emitted. */
  classNames?: Iterable<string>
}>

/** The stylesheet for every style, theme, and global rule defined so far.
 *
 *  Rules live in three cascade layers, `pleat.globals`, `pleat.themes`, and `pleat.atoms`,
 *  so unlayered CSS (an app's own stylesheet, Tailwind utilities) always wins over Pleat. */
export const render = (options: RenderOptions = {}): string => {
  const included =
    options.classNames === undefined ? undefined : new Set(options.classNames)
  const atoms = sortedAtoms()
    .filter(atom => included === undefined || included.has(atom.className))
    .map(atom => atom.rule)
    .join('')
  return [
    LAYER_ORDER,
    `@layer pleat.globals{${globalsIn('globals')}}`,
    `@layer pleat.themes{${globalsIn('themes')}}`,
    `@layer pleat.atoms{${atoms}}`,
  ].join('\n')
}

const CLASS_ATTRIBUTE = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi

/** The class names used in an HTML string. */
export const classNamesIn = (html: string): ReadonlySet<string> => {
  const classNames = new Set<string>()
  for (const match of html.matchAll(CLASS_ATTRIBUTE)) {
    const value = match[1] ?? match[2] ?? match[3] ?? ''
    for (const className of value.split(/\s+/)) {
      if (className !== '') {
        classNames.add(className)
      }
    }
  }
  return classNames
}

/** The stylesheet a server-rendered page needs: every global and theme rule, plus the atoms
 *  whose classes appear in `html`. */
export const renderFor = (html: string): string =>
  render({ classNames: classNamesIn(html) })

/** The attribute that marks Pleat's server-rendered `<style>` element. */
export const STYLE_ATTRIBUTE = 'data-pleat'

const escapeStyleText = (css: string): string => css.replace(/<\//g, '<\\/')

/** A `<style data-pleat>` element for a document head. Pass `html` to include only the atoms
 *  that page uses. */
export const styleTag = (html?: string): string =>
  `<style ${STYLE_ATTRIBUTE}>${escapeStyleText(html === undefined ? render() : renderFor(html))}</style>`

/** Every atom defined so far, in emission order. */
export const atoms = (): ReadonlyArray<Atom> => sortedAtoms()

// BROWSER

type Mounted = Readonly<{
  globals: CSSGroupingRule
  themes: CSSGroupingRule
  atoms: CSSGroupingRule
  insertedAtoms: Array<Atom>
  insertedClassNames: Set<string>
  /** The browser's rule for each global id, to replace when the global changes. */
  insertedGlobals: Map<string, CSSRule>
}>

let mounted: Mounted | undefined

const hasDocument = (): boolean =>
  typeof document !== 'undefined' && typeof CSSStyleSheet !== 'undefined'

const groupingRule = (sheet: CSSStyleSheet, index: number): CSSGroupingRule => {
  const rule = sheet.cssRules.item(index)
  if (!(rule instanceof CSSGroupingRule)) {
    throw new Error('[pleat] This browser does not support cascade layers.')
  }
  return rule
}

const createSheet = (target: Document): CSSStyleSheet => {
  const shell = `${LAYER_ORDER}@layer pleat.globals{}@layer pleat.themes{}@layer pleat.atoms{}`
  if ('adoptedStyleSheets' in target && 'replaceSync' in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(shell)
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet]
    return sheet
  }
  const element = target.createElement('style')
  element.setAttribute(`${STYLE_ATTRIBUTE}-client`, '')
  element.textContent = shell
  target.head.append(element)
  if (element.sheet === null) {
    throw new Error('[pleat] Could not create a stylesheet.')
  }
  return element.sheet
}

const indexOfRule = (block: CSSGroupingRule, rule: CSSRule): number =>
  Array.prototype.indexOf.call(block.cssRules, rule)

const insertGlobal = (target: Mounted, global: Global): void => {
  const block = global.layer === 'globals' ? target.globals : target.themes
  const existing = target.insertedGlobals.get(global.id)
  const existingIndex = existing === undefined ? -1 : indexOfRule(block, existing)
  // NOTE: the new rule goes in before the old one comes out, so a rule the browser rejects
  // leaves the old one in place.
  const index = block.insertRule(
    global.rule,
    existingIndex >= 0 ? existingIndex : block.cssRules.length,
  )
  if (existingIndex >= 0) {
    block.deleteRule(existingIndex + 1)
  }
  const inserted = block.cssRules.item(index)
  if (inserted !== null) {
    target.insertedGlobals.set(global.id, inserted)
  }
}

const insertAtom = (target: Mounted, atom: Atom): void => {
  if (atom._tag === 'Marker' || target.insertedClassNames.has(atom.className)) {
    return
  }
  let low = 0
  let high = target.insertedAtoms.length
  while (low < high) {
    const middle = (low + high) >>> 1
    const candidate = target.insertedAtoms[middle]
    if (candidate !== undefined && compareAtoms(candidate, atom) < 0) {
      low = middle + 1
    } else {
      high = middle
    }
  }
  target.atoms.insertRule(atom.rule, low)
  target.insertedAtoms.splice(low, 0, atom)
  target.insertedClassNames.add(atom.className)
}

/** Creates Pleat's browser stylesheet in `target` and inserts every global and theme rule.
 *  Atoms are inserted later, the first time a style is used. Calling it again does nothing.
 *
 *  {@link use} mounts on first call, so most applications never call this directly. */
export const mount = (target: Document = document): void => {
  if (mounted !== undefined) {
    return
  }
  const sheet = createSheet(target)
  const state: Mounted = {
    globals: groupingRule(sheet, 1),
    themes: groupingRule(sheet, 2),
    atoms: groupingRule(sheet, 3),
    insertedAtoms: [],
    insertedClassNames: new Set(),
    insertedGlobals: new Map(),
  }
  mounted = state
  for (const global of globalsById.values()) {
    insertGlobal(state, global)
  }
}

/** Makes sure every rule for `atoms` is in the browser stylesheet. On the server, does nothing.
 *
 *  Each element's atoms are inserted together, at their sorted position, so the rules an
 *  element depends on are always ordered correctly relative to each other, even next to a
 *  server-rendered `<style data-pleat>`. */
export const insert = (atoms: Iterable<Atom>): void => {
  if (mounted === undefined) {
    if (!hasDocument()) {
      return
    }
    mount()
  }
  if (mounted === undefined) {
    return
  }
  for (const atom of atoms) {
    insertAtom(mounted, atom)
  }
}

/** @internal Forgets the browser stylesheet. For tests. */
export const unmount = (): void => {
  mounted = undefined
}
