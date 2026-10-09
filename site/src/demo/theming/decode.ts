import { Theme } from '@pleat/core'
import type { Attribute, HtmlBuilder } from 'foldkit/html'

import { brandKit } from './tokens.ts'

// Values from a settings form, an API, or a language model are
// decoded against each token's kind, never trusted.
export const decodeBrand = (input: unknown) =>
  Theme.decode(brandKit, input)

// A decoded theme is a list of checked custom properties, so one
// element can carry it inline. Every alias below it follows.
export const themeStyle = <Message>(
  h: HtmlBuilder<Message>,
  theme: Theme.Theme,
): Attribute<Message> =>
  h.Style(Object.fromEntries(theme.declarations))
