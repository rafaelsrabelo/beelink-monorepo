/**
 * The description is written with formatting and stored as Markdown.
 *
 * **Why Markdown and not HTML.** A description is shopkeeper-controlled text rendered on an
 * anonymous, indexed page. Stored as HTML it is an injection waiting for someone to paste a
 * `<script>` — and defending it means sanitising arbitrary HTML on the way in, which is a thing
 * nobody writes correctly by hand and which needs a parser the API does not have. Markdown is
 * plain text at rest: there is nothing to sanitise, because there is nothing dangerous to store.
 *
 * So the editor is WYSIWYG and the *storage* is not. These two functions are the seam, and they
 * are a module rather than part of the component because they are the part worth testing on their
 * own: everything the editor can produce has to survive the round trip.
 */

/** The formatting the toolbar offers, and therefore everything these two functions handle. */
const INLINE = { STRONG: "**", B: "**", EM: "_", I: "_" } as const

function escapeMarkdown(text: string): string {
  // Only the characters that would otherwise become formatting. Escaping more makes a description
  // full of backslashes the moment someone writes a price like `R$ 10 * 2`.
  return text.replace(/([\\`*_[\]])/g, "\\$1")
}

/**
 * What the editor's DOM means, as Markdown.
 *
 * It walks a **known** set of nodes and drops to plain text for anything else. That is the safety
 * property: a node this function does not recognise contributes its text and nothing more, so a
 * pasted table, a `<script>` or a styled `<div>` cannot survive into storage as anything but the
 * words inside it.
 */
export function markdownFromDom(root: Node): string {
  function walk(node: Node): string {
    if (node.nodeType === 3) return escapeMarkdown(node.textContent ?? "")
    if (node.nodeType !== 1) return ""

    const element = node as Element
    const inner = Array.from(element.childNodes).map(walk).join("")

    const wrap = INLINE[element.tagName as keyof typeof INLINE]
    if (wrap) return inner.trim() ? `${wrap}${inner}${wrap}` : inner

    switch (element.tagName) {
      case "BR":
        return "\n"
      case "P":
      case "DIV":
        return `${inner}\n\n`
      case "LI": {
        const ordered = element.parentElement?.tagName === "OL"
        const index = Array.from(element.parentElement?.children ?? []).indexOf(element) + 1
        return `${ordered ? `${index}. ` : "- "}${inner.trim()}\n`
      }
      case "UL":
      case "OL":
        return `${inner}\n`
      case "A": {
        const href = element.getAttribute("href") ?? ""
        // http(s) only. A `javascript:` href is the one thing a link can carry that is an attack,
        // and it is dropped rather than escaped — the words stay, the destination does not.
        return /^https?:\/\//i.test(href) ? `[${inner}](${href})` : inner
      }
      default:
        return inner
    }
  }

  return walk(root).replace(/\n{3,}/g, "\n\n").trim()
}

/**
 * Markdown as the editor should show it.
 *
 * It answers a **string of HTML**, which is the one place in this pair that could be dangerous —
 * so every character of the input is escaped first, and the tags are added afterwards from
 * patterns this function itself controls. Nothing from the stored text can become a tag.
 */
export function domHtmlFromMarkdown(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  const blocks = escaped.split(/\n{2,}/).filter((block) => block.trim())

  return blocks
    .map((block) => {
      const lines = block.split("\n")
      const bulleted = lines.every((line) => /^\s*-\s+/.test(line))
      const numbered = lines.every((line) => /^\s*\d+\.\s+/.test(line))

      if (bulleted || numbered) {
        const items = lines
          .map((line) => `<li>${inline(line.replace(/^\s*(?:-|\d+\.)\s+/, ""))}</li>`)
          .join("")
        return bulleted ? `<ul>${items}</ul>` : `<ol>${items}</ol>`
      }

      return `<p>${inline(lines.join("<br>"))}</p>`
    })
    .join("")
}

/** Inline marks, on text that is already escaped. The order matters: `**` before `_`. */
function inline(text: string): string {
  return text
    .replace(/\\([\\`*_[\]])/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>')
}
