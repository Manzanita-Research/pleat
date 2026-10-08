import { Effect, Option, Schema } from 'effect'
import { Command, type Runtime, type Update } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { load, pushUrl, UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { Message, Model, type Preset } from './message.ts'
import { presetSource } from './presets.ts'
import { AppRoute, urlToAppRoute } from './route.ts'
import { algebraView } from './view/algebra.ts'
import { generativeView } from './view/generative.ts'
import { guideView } from './view/guide.ts'
import { homeView } from './view/home.ts'
import { layoutView } from './view/layout.ts'
import { notFoundView } from './view/notFound.ts'
import { referenceView } from './view/reference.ts'

export { Message, Model }

// INIT

const INITIAL_PRESET: Preset = 'Valid'

export const init: Runtime.RoutingApplicationInit<Model, Message> = url => ({
  model: {
    route: urlToAppRoute(url),
    theme: 'System',
    playground: { tone: 'Primary', size: 'Medium', isPending: false },
    preset: Option.some(INITIAL_PRESET),
    specSource: presetSource(INITIAL_PRESET),
  },
})

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(
      Effect.tap(() => Effect.sync(() => window.scrollTo({ top: 0 }))),
      Effect.as(Message.CompletedNavigateInternal()),
    ),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) => load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({ model, commands: [LoadExternal({ href })] }),
      }),
    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, { route: () => urlToAppRoute(url) }),
    }),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    ClickedTheme: ({ theme }) => ({ model: modifyFields(model, { theme: () => theme }) }),
    PickedTone: ({ tone }) => ({
      model: modifyFields(model, {
        playground: playground => ({ ...playground, tone }),
      }),
    }),
    PickedSize: ({ size }) => ({
      model: modifyFields(model, {
        playground: playground => ({ ...playground, size }),
      }),
    }),
    PickedPending: ({ isPending }) => ({
      model: modifyFields(model, {
        playground: playground => ({ ...playground, isPending }),
      }),
    }),
    EditedSpec: ({ source }) => ({
      model: modifyFields(model, {
        specSource: () => source,
        preset: () => Option.none(),
      }),
    }),
    ClickedPreset: ({ preset }) => ({
      model: modifyFields(model, {
        specSource: () => presetSource(preset),
        preset: () => Option.some(preset),
      }),
    }),
  })

// VIEW

const TITLE_SUFFIX = 'Pleat'

const routeTitle = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => 'Pleat | Algebraic styles for Foldkit',
    Guide: () => `Guide | ${TITLE_SUFFIX}`,
    Algebra: () => `The algebra | ${TITLE_SUFFIX}`,
    Generative: () => `Generative interfaces | ${TITLE_SUFFIX}`,
    Reference: () => `Reference | ${TITLE_SUFFIX}`,
    NotFound: () => `Not found | ${TITLE_SUFFIX}`,
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model.route),
  body: layoutView(
    model,
    h,
    AppRoute.match(model.route, {
      Home: () => homeView(model, h),
      Guide: () => guideView(h),
      Algebra: () => algebraView(h),
      Generative: () => generativeView(model, h),
      Reference: () => referenceView(h),
      NotFound: () => notFoundView(h),
    }),
  ),
})
