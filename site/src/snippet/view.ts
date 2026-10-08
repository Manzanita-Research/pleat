import { Style } from '@pleat/core'
import { css } from '@pleat/foldkit'
import { Button } from '@foldkit/ui'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { button } from './recipe.ts'
import { link } from './styles.ts'

type Model = Readonly<{ isSaving: boolean; isPrimary: boolean }>
const Message = defineMessageUnion({ ClickedSave: {} })
type Message = typeof Message.Type

const ring = Style.make({ outline: '2px solid currentColor' })

export const saveView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: Message.ClickedSave(),
      isDisabled: model.isSaving,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            // One css() call per element: Foldkit keeps only the
            // last Class.
            ...css(
              button({
                tone: model.isPrimary ? 'Primary' : 'Neutral',
                isPending: model.isSaving,
              }),
              model.isPrimary ? ring : Style.empty,
            ),
          ],
          ['Save'],
        ),
    },
    h,
  )

export const footerLink = (h: HtmlBuilder<Message>): Html =>
  h.a([h.Href('/about'), ...css(link)], ['About'])
