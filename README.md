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

| Package                              | What it is                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [`@pleat/core`](packages/core)       | The algebra: `Style`, `When`, `Recipe`, `Var`, `Token`, `Theme`, `Global`, `Sheet`, `Calc`, `Color`. Depends only on Effect.        |
| [`@pleat/foldkit`](packages/foldkit) | `css()` for Foldkit views, and a `renderDocument` that puts each page's CSS in its head for server rendering and static generation. |

## What you get

- **Lawful composition.** `Style` is an idempotent monoid under `merge`, exposed as an Effect `Reducer`. Merging reads like object spread, including a shorthand written after its longhands. Equal styles are the same object.
- **Conditions that fit Foldkit.** `When.hover`, `When.focusVisible`, media and container queries, "inside a hovered card", and the states `@foldkit/ui` sets: `When.open`, `When.selected`, `When.disabled`, `When.highlighted`. A fixed precedence order decides what wins when two hold at once, so a disabled button doesn't light up on hover.
- **Variants typed by Schema.** `Recipe.make` takes options per dimension; the props are an Effect Schema and `Recipe.jsonSchema` gives the JSON Schema for structured output.
- **Tokens and themes.** Tokens are custom properties with kinds; themes are checked values for them, swapped by an attribute in your view.
- **No CSS work in render.** `css()` returns cached, frozen attributes for styles it has seen. The browser inserts a style's rules the first time it is used, at their sorted position.
- **Server rendering and static pages.** Class names are hashes of their declarations, so the server and the client compute the same ones and hydration matches.
- **Plays well with Tailwind.** Rules live in the `pleat` cascade layer, so unlayered CSS, Tailwind utilities included, always wins.

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

## Where it came from

Pleat started in 2017 as Further, a library where a style was a function of props composed with Fantasy Land `map`, `concat`, and `chain`. Treating styles as values was the right idea. The monad was too strong: `chain` let a style depend on props in ways nothing could see before render. Pleat keeps the values and the transforms and replaces the monad with structure that can be inspected ahead of time, a monoid for merging and selective choice among finished branches for props. The [algebra page](site/src/view/algebra.ts) of the docs explains the rest.

## License

MIT
