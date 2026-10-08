import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Design from '../design.ts'
import type { Message } from '../message.ts'
import { homeRouter } from '../route.ts'
import { articleStyle, pageIntro } from './guide.ts'

// NOTE: one prerendered 404.html answers every missing path, so the page
// must not depend on the path or hydration would disagree with it.
export const notFoundView = (h: HtmlBuilder<Message>): Html =>
  h.article(
    [...css(articleStyle)],
    [
      pageIntro(
        h,
        'Not found',
        'Nothing is folded here',
        'There is no page at this address.',
      ),
      h.div(
        [],
        [
          h.a(
            [h.Href(homeRouter()), ...css(Design.button({ tone: 'Primary' }))],
            ['Go home'],
          ),
        ],
      ),
    ],
  )
