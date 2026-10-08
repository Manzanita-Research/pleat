import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { AppRoute } from './route.ts'

// MODEL

export const ThemeChoice = Schema.Literals(['System', 'Light', 'Dark'])
export type ThemeChoice = typeof ThemeChoice.Type

export const Tone = Schema.Literals(['Primary', 'Neutral', 'Quiet'])
export type Tone = typeof Tone.Type

export const Size = Schema.Literals(['Small', 'Medium', 'Large'])
export type Size = typeof Size.Type

export const Preset = Schema.Literals(['Valid', 'UnknownTone', 'Injection', 'Overlong'])
export type Preset = typeof Preset.Type

export const Playground = Schema.Struct({
  tone: Tone,
  size: Size,
  isPending: Schema.Boolean,
})
export type Playground = typeof Playground.Type

export const Model = Schema.Struct({
  route: AppRoute,
  theme: ThemeChoice,
  isMenuOpen: Schema.Boolean,
  playground: Playground,
  preset: Schema.Option(Preset),
  specSource: Schema.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedTheme: { theme: ThemeChoice },
  ClickedMenuToggle: {},
  PickedTone: { tone: Tone },
  PickedSize: { size: Size },
  PickedPending: { isPending: Schema.Boolean },
  EditedSpec: { source: Schema.String },
  ClickedPreset: { preset: Preset },
})
export type Message = typeof Message.Type
