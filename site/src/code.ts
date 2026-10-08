import { Style, When } from '@pleat/core'
import { css } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { tokens } from './design.ts'

const { color, font, radius, space, text } = tokens

// STYLES

const frame = Style.make({
  position: 'relative',
  backgroundColor: color.sunken,
  border: `1px solid ${color.line}`,
  borderRadius: radius.lg,
  overflow: 'hidden',
})

const caption = Style.make({
  display: 'flex',
  justifyContent: 'space-between',
  gap: space[3],
  paddingBlock: space[2],
  paddingInline: space[4],
  borderBottom: `1px solid ${color.line}`,
  fontFamily: font.mono,
  fontSize: text.xs,
  color: color.muted,
})

const block = Style.make({
  margin: 0,
  padding: space[4],
  overflowX: 'auto',
  fontFamily: font.mono,
  fontSize: text.sm,
  lineHeight: 1.65,
  tabSize: 2,
  fontVariantLigatures: 'none',
}).pipe(Style.when(When.minWidth('48rem'), { padding: space[5] }))

const TOKEN_STYLES = {
  Comment: Style.make({ color: color.muted, fontStyle: 'italic' }),
  String: Style.make({ color: color.green }),
  Keyword: Style.make({ color: color.accent }),
  Type: Style.make({ color: color.indigo }),
  Call: Style.make({ color: color.ink, fontWeight: 600 }),
  Number: Style.make({ color: color.accent }),
  Plain: Style.empty,
} as const

type TokenKind = keyof typeof TOKEN_STYLES

// TOKENIZER

const KEYWORDS: ReadonlySet<string> = new Set([
  'import',
  'from',
  'export',
  'const',
  'let',
  'type',
  'interface',
  'return',
  'if',
  'else',
  'true',
  'false',
  'yield',
  'function',
  'as',
  'new',
  'undefined',
  'null',
  'extends',
  'readonly',
  'await',
  'async',
  'typeof',
  'in',
  'of',
  'for',
  'class',
  'default',
])

const PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)(\s*\()?|([\s\S])/g

type Token = readonly [kind: TokenKind, text: string]

const tokenize = (source: string): ReadonlyArray<Token> => {
  const result: Array<Token> = []
  for (const match of source.matchAll(PATTERN)) {
    const [whole, comment, string, number, identifier, call] = match
    if (comment !== undefined) {
      result.push(['Comment', comment])
    } else if (string !== undefined) {
      result.push(['String', string])
    } else if (number !== undefined) {
      result.push(['Number', number])
    } else if (identifier !== undefined) {
      const kind: TokenKind = KEYWORDS.has(identifier)
        ? 'Keyword'
        : /^[A-Z]/.test(identifier)
          ? 'Type'
          : call !== undefined
            ? 'Call'
            : 'Plain'
      result.push([kind, identifier])
      if (call !== undefined) {
        result.push(['Plain', call])
      }
    } else {
      result.push(['Plain', whole])
    }
  }
  return result
}

const merged = (tokens: ReadonlyArray<Token>): ReadonlyArray<Token> =>
  tokens.reduce<Array<Token>>((accumulated, token) => {
    const previous = accumulated.at(-1)
    if (previous !== undefined && previous[0] === token[0]) {
      accumulated[accumulated.length - 1] = [token[0], previous[1] + token[1]]
    } else {
      accumulated.push(token)
    }
    return accumulated
  }, [])

const highlighted = new Map<string, ReadonlyArray<Token>>()

const highlight = (source: string): ReadonlyArray<Token> => {
  const cached = highlighted.get(source)
  if (cached !== undefined) {
    return cached
  }
  const result = merged(tokenize(source.replace(/\s+$/, '')))
  highlighted.set(source, result)
  return result
}

// VIEW

/** A highlighted TypeScript listing with an optional file name. */
export const codeBlock = <Message>(
  h: HtmlBuilder<Message>,
  source: string,
  title?: string,
): Html =>
  h.figure(
    [...css(frame)],
    [
      ...(title === undefined
        ? []
        : [
            h.figcaption(
              [...css(caption)],
              [h.span([], [title]), h.span([], ['TypeScript'])],
            ),
          ]),
      h.pre(
        [...css(block)],
        [
          h.code(
            [],
            highlight(source).map(([kind, value]) =>
              kind === 'Plain' ? value : h.span([...css(TOKEN_STYLES[kind])], [value]),
            ),
          ),
        ],
      ),
    ],
  )
