/**
 * The Markdown a product description is stored as, read into blocks — pure, so the shop window's
 * renderer, the panel's editor and the page's metadata all read one grammar, and it can be tested
 * without a browser.
 *
 * The grammar is exactly what `blocks/catalog/rich-text.ts` writes: paragraphs, `- ` and `1. `
 * lists, `**strong**`, `_em_`, `[text](https://…)` and a backslash before a character that would
 * otherwise format. Nothing else is Markdown here: a `#` or a `>` is text, because the editor never
 * writes one and a shopkeeper who types one means the character.
 *
 * Nothing in the result is markup. A block is data, and whoever renders it decides what a link or
 * a strong becomes — which is what keeps stored text from ever turning into a tag.
 */

export type MarkdownInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: MarkdownInline[] }
  | { kind: "em"; children: MarkdownInline[] }
  /** Only ever `http(s)`: anything else the editor already dropped, and this parser drops again. */
  | { kind: "link"; href: string; children: MarkdownInline[] }

export type MarkdownBlock =
  /** One paragraph; each line was a soft break in the editor. */
  | { kind: "paragraph"; lines: MarkdownInline[][] }
  | { kind: "list"; ordered: boolean; items: MarkdownInline[][] }

const BULLET = /^\s*-\s+/
const NUMBERED = /^\s*\d+\.\s+/
const LINK = /^\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/i

/**
 * Blocks, from the stored text.
 *
 * List items separated by a blank line are one list. The editor writes them tight, but text that
 * came from elsewhere — the description pasted into the first shops — has a blank line between
 * every item, and a list of five single-item lists reads as five bullets with a gap each, which is
 * not what anyone wrote.
 */
export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []

  for (const chunk of markdown.split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((line) => line.trim())
    if (lines.length === 0) continue

    const bulleted = lines.every((line) => BULLET.test(line))
    const numbered = !bulleted && lines.every((line) => NUMBERED.test(line))

    if (bulleted || numbered) {
      const items = lines.map((line) => parseInline(line.replace(bulleted ? BULLET : NUMBERED, "")))
      const previous = blocks.at(-1)
      if (previous?.kind === "list" && previous.ordered === numbered) previous.items.push(...items)
      else blocks.push({ kind: "list", ordered: numbered, items })
      continue
    }

    blocks.push({ kind: "paragraph", lines: lines.map((line) => parseInline(line)) })
  }

  return blocks
}

/**
 * One line's marks. A mark that never closes is text: `R$ 10 * 2` keeps its asterisk, and a lone
 * `_` in a code stays where it was typed.
 */
export function parseInline(text: string): MarkdownInline[] {
  const out: MarkdownInline[] = []
  let plain = ""
  let at = 0

  const flush = () => {
    if (plain) out.push({ kind: "text", text: plain })
    plain = ""
  }

  while (at < text.length) {
    const char = text[at] as string

    if (char === "\\" && at + 1 < text.length) {
      plain += text[at + 1]
      at += 2
      continue
    }

    if (text.startsWith("**", at)) {
      const close = text.indexOf("**", at + 2)
      if (close > at + 2) {
        flush()
        out.push({ kind: "strong", children: parseInline(text.slice(at + 2, close)) })
        at = close + 2
        continue
      }
    }

    if (char === "_") {
      const close = text.indexOf("_", at + 1)
      if (close > at + 1) {
        flush()
        out.push({ kind: "em", children: parseInline(text.slice(at + 1, close)) })
        at = close + 1
        continue
      }
    }

    if (char === "[") {
      const match = LINK.exec(text.slice(at))
      if (match) {
        flush()
        out.push({ kind: "link", href: match[2] as string, children: parseInline(match[1] as string) })
        at += match[0].length
        continue
      }
    }

    plain += char
    at += 1
  }

  flush()
  return out
}

function inlineText(nodes: readonly MarkdownInline[]): string {
  return nodes.map((node) => (node.kind === "text" ? node.text : inlineText(node.children))).join("")
}

/**
 * The words alone, one space between them: what a `<meta name="description">` and an Open Graph
 * card can carry, which is no formatting at all. The caller cuts it to length.
 */
export function plainTextOf(markdown: string): string {
  return parseMarkdown(markdown)
    .flatMap((block) => (block.kind === "paragraph" ? block.lines : block.items).map(inlineText))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

function isBulleted(block: MarkdownBlock): boolean {
  return block.kind === "list" && !block.ordered
}

/**
 * The first bulleted list's items, each keeping its marks — the "Sobre este item" bullets, until a
 * field of their own exists. A numbered list is steps, not highlights, and is left where it is.
 */
export function firstListOf(markdown: string): MarkdownInline[][] {
  const list = parseMarkdown(markdown).find(isBulleted)
  return list?.kind === "list" ? list.items : []
}

/**
 * A one-line paragraph that only introduces the list after it — "**Destaques do produto:**", or
 * "🥛 **Destaques do produto**": it ends in a colon, or is bold and nothing else but symbols.
 */
function isLeadIn(block: MarkdownBlock | undefined): boolean {
  if (block?.kind !== "paragraph" || block.lines.length !== 1) return false
  const line = block.lines[0] as MarkdownInline[]
  const onlyBold = line.some((node) => node.kind === "strong") && line.every((node) => node.kind === "strong" || (node.kind === "text" && !/[\p{L}\p{N}]/u.test(node.text)))
  return onlyBold || inlineText(line).trim().endsWith(":")
}

/**
 * Every block but that first bulleted list, and the line that introduced it: the description, once
 * "Sobre este item" has drawn the list under a heading of its own. Left behind, "Destaques do
 * produto:" would head nothing.
 */
export function withoutFirstList(markdown: string): MarkdownBlock[] {
  const blocks = parseMarkdown(markdown)
  const at = blocks.findIndex(isBulleted)
  if (at === -1) return blocks
  const from = isLeadIn(blocks[at - 1]) ? at - 1 : at
  return [...blocks.slice(0, from), ...blocks.slice(at + 1)]
}
