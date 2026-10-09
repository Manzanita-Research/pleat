import type { Theme } from '@pleat/core'

import { contrastPairs, semantic } from '../demo/theming/tokens.ts'
import { dark, harbor, highContrast, light, orchard } from '../demo/theming/themes.ts'
import { type Pair, pair } from './check.ts'
import type { UseCase } from './metric.ts'

// NOTE: the theming page's design system names its pairs but not what they
// are for. Its main text is body text; every other pair labels a control,
// a badge, or a callout, which is content text.
const useCaseOf = (text: (typeof contrastPairs)[number]['text']): UseCase =>
  text === semantic.color.text ? 'BodyText' : 'ContentText'

/** The theming page's `contrastPairs`, each with a use case. */
export const THEMING_PAIRS: ReadonlyArray<Pair> = contrastPairs.map(
  ({ text, background }) =>
    pair(
      `${text.path.at(-1)} on ${background.path.at(-1)}`,
      text,
      background,
      useCaseOf(text),
    ),
)

/** Every brand and mode the theming page can combine. A brand's palette and a mode's aliases
 *  sit on the same element, so the mode resolves against the brand. */
export const THEMING_SCOPES: ReadonlyArray<
  readonly [name: string, scopes: ReadonlyArray<Theme.Theme>]
> = [
  ['Harbor, light', [harbor, light]],
  ['Harbor, dark', [harbor, dark]],
  ['Harbor, high contrast', [harbor, highContrast]],
  ['Orchard, light', [orchard, light]],
  ['Orchard, dark', [orchard, dark]],
  ['Orchard, high contrast', [orchard, highContrast]],
]
