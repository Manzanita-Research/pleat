# Pleat

Algebraic, typed styles for [Foldkit](https://foldkit.dev) and [Effect](https://effect.website) v4.

Styles in Pleat are values. You merge them, nest them under conditions, and vary them by your Model, and the laws you'd expect hold. Every rule compiles to atomic CSS when your modules load, so a view only picks among finished styles: a recipe call is a few map lookups, server-rendered pages ship only the CSS they use, and a language model generating your interface can choose styles but never write CSS.

```ts
import { Recipe, Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'

const card = Style.make({ display: 'grid', gap: 12, padding: 20 }).pipe(
  Style.when(When.hover, { boxShadow: '0 8px 24px -12px rgb(0 0 0 / 0.3)' }),
)

const badge = Recipe.make({
  variants: { status: { Draft: { color: 'gray' }, Live: { color: 'green' } } },
})

const postView = (post: Post, h: HtmlBuilder<Message>): Html =>
  h.article(
    [...css(card)],
    [
      h.h2([], [post.title]),
      h.span([...css(badge({ status: post.status }))], [post.status]),
    ],
  )
```

## Packages

| Package                              | What it is                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@pleat/core`](packages/core)       | The algebra: `Style`, `When`, `Recipe`, `Var`, `Token`, `Theme`, `Global`, `Sheet`, `Calc`, `Color`. Depends only on Effect.                                                                    |
| [`@pleat/foldkit`](packages/foldkit) | `css()` for Foldkit views, `cssClass()` for `@foldkit/ui` parts that take class names, and a `renderDocument` that puts each page's CSS in its head for server rendering and static generation. |

## What you get

- **Lawful composition.** `Style` is an idempotent monoid under `merge`, exposed as an Effect `Reducer`. Merging reads like object spread, including a shorthand written after its longhands. Equal styles are the same object.
- **Conditions that fit Foldkit.** `When.hover`, `When.focusVisible`, media and container queries, "inside a hovered card", and the states `@foldkit/ui` sets: `When.open`, `When.selected`, `When.disabled`, `When.highlighted`. A fixed precedence order decides what wins when two hold at once, so a disabled button doesn't light up on hover.
- **Variants typed by Schema.** `Recipe.make` takes options per dimension; the props are an Effect Schema and `Recipe.jsonSchema` gives the JSON Schema for structured output.
- **Tokens and themes.** Tokens are custom properties with kinds, in any tree you like; themes are checked values for them, applied by an attribute on any element, so scopes nest. Themes from outside the program are decoded before they become CSS. See [Theming](#theming).
- **No CSS work in render.** `css()` returns cached, frozen attributes for styles it has seen. The browser inserts a style's rules the first time it is used, at their sorted position.
- **Server rendering and static pages.** Class names are hashes of their declarations, so the server and the client compute the same ones and hydration matches.
- **Plays well with Tailwind.** Pleat declares the page's layer order as `theme, base, components, pleat, utilities`. A Tailwind v4 utility on an element beats Pleat's styles, Pleat's styles beat Tailwind's preflight reset and its components layer, and unlayered CSS beats both. This holds when Pleat's style is the page's first stylesheet, as `renderDocument` makes it, and in any order once the client mounts. `className` passes any class token through, Tailwind's arbitrary values and variants included.

## Theming

Tokens come in three layers: a palette, semantic tokens that say what a value is for, such as `surface` or `accent`, and a few component tokens like `button.radius`. Themes fill each layer: light, dark, and high-contrast modes point the semantic colors at the palette, a second brand is `Theme.extend` of the first, and a density points spacing and type at other steps. Components read only semantic tokens, so changing the mode, the brand, or the density changes nothing in a component. A theme from outside the program, such as a customer's brand from a settings API, goes through `Theme.decodePartial`, which checks each value against its token's kind and can run whole-theme rules such as contrast, and `Theme.bindings` applies the result to one element.

```ts
// A second brand overrides only what makes it different.
const orchard = Theme.extend(harbor, palette, {
  brand: shades(345, 0.15),
  radius: { sm: '8px', md: '12px', lg: '20px' },
})

// Dark mode points the semantic colors at other steps of the palette.
const dark = Theme.extend(light, mode, {
  color: { surface: gray[950], text: gray[50], accent: brand[400] },
})

// Each axis is one attribute, on the page or on any element inside it.
Global.theme(orchard, { selector: '[data-ds-brand="Orchard"]' })
Global.theme(dark, { selector: '[data-ds-mode="Dark"]' })

// A brand from outside the program is checked against each token's kind,
// then bound to one element. Every alias below it follows.
const decodeBrand = (input: unknown) => Theme.decodePartial(Theme.empty, brandKit, input)

h.section([...css(card, ...Theme.bindings(customerBrand))], children)
```

The full page, [`site/src/view/theming.ts`](site/src/view/theming.ts), renders the same card from tokens and from hardcoded values side by side, nests scopes three deep, and decodes brands you type. Run `pnpm site:dev` and open `/theming`.

## Foldkit UI

[`@foldkit/ui`](https://foldkit.dev) handles behavior and accessibility, and marks each part's state with data attributes. Pleat's `When` conditions select those attributes (`open`, `selected`, `highlighted`, `disabled`, `checked`, `indeterminate`, and the transition states), so a part's states live in its recipe and the view only spreads attributes. Parts that take attributes use `css()`; parts that take class names, such as a Menu's items, use `cssClass()`. Each condition was checked against what `@foldkit/ui` 0.167 renders, and a browser test drives a Menu by keyboard.

```ts
const switchTrack = When.marker('switch')

const track = Style.make({ width: 44, height: 24, backgroundColor: color.line }).pipe(
  Style.merge(Style.mark(switchTrack)),
  Style.when(When.checked, { backgroundColor: color.accent }),
  Style.when(When.disabled, { opacity: 0.5, cursor: 'not-allowed' }),
)

// The thumb has no state of its own. It moves when its track is checked.
const thumb = Style.make({ aspectRatio: '1', backgroundColor: color.surface }).pipe(
  Style.when(When.within(switchTrack, When.checked), { translate: '100%' }),
)

Switch.view(
  {
    id: 'digest',
    isChecked: model.isDigestOn,
    onToggle: isChecked => Message.ToggledDigest({ isChecked }),
    toView: attributes =>
      h.button([...attributes.button, ...css(track)], [h.span([...css(thumb)], [])]),
  },
  h,
)
```

The full page, [`site/src/view/foldkitUi.ts`](site/src/view/foldkitUi.ts), styles eleven components live, lists which condition each part sets, and covers the gotchas: Dialog uses `show()`, so style its `backdrop` part rather than `When.backdrop`, and in a RadioGroup `data-active` marks the tab stop even without focus, so use `When.focusVisible` there. Run `pnpm site:dev` and open `/foldkit-ui`.

## Checked, not just claimed

- Property-based tests check associativity, identity, idempotence, right regularity, the Effect `Reducer`, nested conditions, and that the same declarations always compile to the same classes.
- A Chromium test renders hundreds of random styles under random states (hover and focus-visible forced through the DevTools protocol, dark mode emulated, breakpoints by viewport) and checks every computed value against `Style.resolve`, the function that defines what a style means. It covers the server-rendered sheet and the browser's lazy insertion. Breaking the compiler on purpose (unsorted rules, wrong insertion position, unequal specificity) makes it fail.

## Performance

From [`bench/RESULTS.md`](bench/RESULTS.md), on an AMD Ryzen 5 7640HS with Node 26:

| One styled element per render         |   Time | Relative |
| ------------------------------------- | -----: | -------: |
| Pleat: recipe → `css()`               |  90 ns |     1.0× |
| Pleat: recipe + override → `css()`    | 107 ns |     1.2× |
| cva                                   | 228 ns |     2.5× |
| cva + tailwind-merge with an override | 334 ns |     3.7× |

## The docs site

[`site/`](site) is the documentation: a Foldkit app, prerendered to static pages, styled only with Pleat, with a recipe playground and a generative-interface demo. [`infra/`](infra) deploys it to Cloudflare with an [Alchemy](https://alchemy.run) stack. That is the FACE stack: Foldkit, Alchemy, Cloudflare, Effect.

## Development

```sh
pnpm install
pnpm typecheck       # every package, the site, and the browser tests
pnpm test            # unit and property tests
pnpm test:browser    # the Chromium cascade test (set CHROMIUM_PATH if Playwright's isn't installed)
pnpm bench           # the render benchmark
pnpm site:dev        # the docs site with hot reload
pnpm site:build      # the static site in site/dist/client
pnpm check           # all of the above that CI runs
```

Deploying the site needs Cloudflare credentials: locally, `pnpm --dir infra exec alchemy profile edit` once, then `pnpm --dir infra deploy`. In CI, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as repository secrets and run the Deploy workflow.

## License

MIT
