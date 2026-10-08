import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import * as FoldkitUi from './demo/foldkitUi.ts'
import { Brand, Density, Mode, Scope } from './demo/theming/scope.ts'
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

export const BrandPreset = Schema.Literals([
  'Valid',
  'MissingHash',
  'Injection',
  'WrongKind',
])
export type BrandPreset = typeof BrandPreset.Type

export const Theming = Schema.Struct({
  scope: Scope,
  brandPreset: Schema.Option(BrandPreset),
  brandSource: Schema.String,
})
export type Theming = typeof Theming.Type

export const Model = Schema.Struct({
  route: AppRoute,
  theme: ThemeChoice,
  isMenuOpen: Schema.Boolean,
  playground: Playground,
  preset: Schema.Option(Preset),
  specSource: Schema.String,
  theming: Theming,
  foldkitUi: FoldkitUi.Model,
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
  PickedMode: { mode: Mode },
  PickedBrand: { brand: Brand },
  PickedDensity: { density: Density },
  EditedBrandSource: { source: Schema.String },
  ClickedBrandPreset: { preset: BrandPreset },
  GotFoldkitUiMessage: { message: FoldkitUi.Message },
})
export type Message = typeof Message.Type
