# @pleat/store

A theme store for [Pleat](../../README.md) on a Cloudflare Durable Object, and a client that keeps pages in step with it. One store can serve the same themes to many sites: each publish is a new version, every page that reads the theme gets it, and pages that are open get it live.

```sh
pnpm add @pleat/core @pleat/store effect
pnpm add -D alchemy # for the Worker and Durable Object
```

## A catalog

A store keeps the themes in its catalog. Each one is the token tree a published version fills, and optionally a [shape](../../README.md#shapes) that derives the served theme from it, so a version can be as small as a palette:

```ts
import { Catalog } from '@pleat/store'

export const catalog = Catalog.make({
  'house-paper': Catalog.theme(light, { shape: look, checks: [textReadsOnDye] }),
})
```

Every publish is decoded against the entry's tokens, built through its shape, and run through its checks. A version that fails is refused with every problem listed, and nothing is stored.

## The Worker

`@pleat/store/cloudflare` has the Worker and the Durable Object, one object per theme, built with [Alchemy](https://alchemy.run):

```ts
// themes/worker.ts
import { worker } from '@pleat/store/cloudflare'

import { catalog } from './catalog.ts'

export default worker('Themes', { main: import.meta.url, catalog })
```

Yield it in your Alchemy stack. Publishing needs a secret, `PLEAT_STORE_TOKEN`, read from the environment when you deploy.

| Request                         | What it does                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /<theme>.css`              | The latest version as one CSS rule, with an ETag. Caches revalidate it and get a 304 while it hasn't changed.         |
| `GET /<theme>.json`             | The latest version: its number, the values as published, the CSS, the ETag, and when it was published.                |
| `GET /<theme>/<n>.css`, `.json` | Version `n`. Versions never change, so these are cached for good. Pin one, or point back at it to roll back.          |
| `GET /<theme>/versions`         | Every version's number, ETag, and time.                                                                               |
| `GET /<theme>/live`             | A WebSocket that sends the latest version, then each new one as it is published.                                      |
| `POST /<theme>`                 | Publishes the JSON body as the next version. Needs `Authorization: Bearer <PLEAT_STORE_TOKEN>`. 201, 401, 404 or 422. |

Reads are public and cross-origin. The routes are plain `effect/http` routes over a `Versions` service, so `Routes.make(catalog, { token })` with `Versions.memory` runs the same API in a test.

## Reading a theme

`Remote` reads a theme from a page. What the store sends is decoded and checked against the entry again before it becomes CSS.

```ts
import { Remote } from '@pleat/store'

import pinned from './house-paper.json' // the latest version, saved at build time

const remote = Remote.make(
  'https://themes.example.com',
  'house-paper',
  catalog['house-paper'],
  {
    pinned,
  },
)
```

- **Server rendering:** `Remote.apply(remote)` applies the latest version with `Global.theme` before you render, so `renderDocument` puts it in the page's stylesheet and the page never shows another theme first.
- **Live:** `Remote.updates(remote)` is a Stream of every version from now on. It reconnects while the store is away. In a Foldkit app, map it to a Message in a Subscription.
- **Offline:** without a network, or when the store sends something that doesn't pass, `Remote.latest` gives the pinned version.

## Try it locally

`demo/` is an Alchemy stack with a store for one light and a server-rendered page that wears it. `alchemy dev` runs both in workerd on this machine, with no Cloudflare account:

```sh
cd packages/store
PLEAT_STORE_TOKEN=demo-token STORE_URL=http://localhost:8787 pnpm demo

curl -X POST -H 'authorization: Bearer demo-token' \
  -d '{"ground":"#f9f5eb","ink":"#553364","dye":"#0b699f","glow":"#fd53b4","tone":{"lightness":0.5,"chroma":0.13}}' \
  http://localhost:8787/demo-paper
```

Open http://localhost:8788 for the page, and the docs site's `/theming?store=http://localhost:8787` to have the light editor follow the store. Publish another light and both change without a reload.
