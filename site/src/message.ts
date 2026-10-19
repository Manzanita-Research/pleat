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

export const LightColor = Schema.Literals(['Ground', 'Ink', 'Dye', 'Glow'])
export type LightColor = typeof LightColor.Type

export const LightPreset = Schema.Literals(['Paper', 'Night'])
export type LightPreset = typeof LightPreset.Type

export const Light = Schema.Struct({
  ground: Schema.String,
  ink: Schema.String,
  dye: Schema.String,
  glow: Schema.String,
  tone: Schema.Struct({ lightness: Schema.Number, chroma: Schema.Number }),
})
export type Light = typeof Light.Type

/** A theme store the light editor follows, from `?store=` and `?theme=` in the URL. */
export const StoreSource = Schema.Struct({ url: Schema.String, theme: Schema.String })
export type StoreSource = typeof StoreSource.Type

export const Theming = Schema.Struct({
  scope: Scope,
  brandPreset: Schema.Option(BrandPreset),
  brandSource: Schema.String,
  light: Light,
  lightPreset: Schema.Option(LightPreset),
  store: Schema.Option(StoreSource),
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
  UpdatedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedTheme: { theme: ThemeChoice },
  ClickedMenuToggle: {},
  SelectedTone: { tone: Tone },
  SelectedSize: { size: Size },
  UpdatedPending: { isPending: Schema.Boolean },
  UpdatedSpec: { source: Schema.String },
  ClickedPreset: { preset: Preset },
  SelectedMode: { mode: Mode },
  SelectedBrand: { brand: Brand },
  SelectedDensity: { density: Density },
  UpdatedBrandSource: { source: Schema.String },
  ClickedBrandPreset: { preset: BrandPreset },
  UpdatedLightColor: { color: LightColor, value: Schema.String },
  UpdatedToneLightness: { lightness: Schema.Number },
  UpdatedToneChroma: { chroma: Schema.Number },
  ClickedLightPreset: { preset: LightPreset },
  ReceivedStoreLight: { light: Light, version: Schema.Number },
  GotFoldkitUiMessage: { message: FoldkitUi.Message },
})
export type Message = typeof Message.Type
