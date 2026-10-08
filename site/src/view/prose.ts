import { Style } from '@pleat/core'
import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Design from '../design.ts'

const INLINE = /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g

/** Text with `code`, [links](/path), and **bold**. */
export const rich = <Message>(
  h: HtmlBuilder<Message>,
  text: string,
): ReadonlyArray<Html | string> =>
  text.split(INLINE).flatMap((part): ReadonlyArray<Html | string> => {
    if (part === '') {
      return []
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return [h.code([...css(Design.inlineCode)], [part.slice(1, -1)])]
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return [h.strong([], [part.slice(2, -2)])]
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link !== null) {
      const [, label = '', href = ''] = link
      return [h.a([h.Href(href), ...css(Design.link)], [label])]
    }
    return [part]
  })

export const paragraph = <Message>(h: HtmlBuilder<Message>, text: string): Html =>
  h.p([...css(Design.body)], rich(h, text))

export const bullets = <Message>(
  h: HtmlBuilder<Message>,
  items: ReadonlyArray<string>,
): Html =>
  h.ul(
    [...css(Design.list)],
    items.map(item => h.li([], rich(h, item))),
  )

const sectionStyle = Style.merge(Design.prose, Style.make({ scrollMarginTop: '6rem' }))

export const section = <Message>(
  h: HtmlBuilder<Message>,
  id: string,
  title: string,
  children: ReadonlyArray<Html>,
): Html =>
  h.section(
    [h.Id(id), ...css(sectionStyle)],
    [h.h2([...css(Design.heading)], [title]), ...children],
  )

export const subsection = <Message>(
  h: HtmlBuilder<Message>,
  title: string,
  children: ReadonlyArray<Html>,
): Html =>
  h.div(
    [...css(Design.stack(Design.tokens.space[3]))],
    [h.h3([...css(Design.subheading)], [title]), ...children],
  )
