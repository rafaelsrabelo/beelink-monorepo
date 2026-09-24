// React
import type { ReactNode } from "react"

// UI
import { parseMarkdown, type MarkdownInline } from "@harness-monorepo/ui/lib/markdown"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontRichTextProps {
  /** As the editor stored it. See `lib/markdown`. */
  markdown: string
  className?: string
}

function renderInline(nodes: readonly MarkdownInline[]): ReactNode[] {
  return nodes.map((node, at) => {
    switch (node.kind) {
      case "text":
        return node.text
      case "strong":
        return <strong key={at}>{renderInline(node.children)}</strong>
      case "em":
        return <em key={at}>{renderInline(node.children)}</em>
      case "link":
        return (
          // A shopkeeper's link leaves the shop, so it opens apart and carries no referrer.
          <a key={at} href={node.href} rel="noreferrer" target="_blank" className="underline underline-offset-2">
            {renderInline(node.children)}
          </a>
        )
    }
  })
}

/**
 * A description as the shopkeeper formatted it, drawn as elements and never as HTML.
 *
 * The stored text is Markdown so that nothing dangerous is ever stored; this is the other half of
 * that promise. Every element here comes from the parser's block kinds, and the words inside them
 * are React text, so a `<script>` in a description is nine characters on the page.
 *
 * No `whitespace-pre-line`: a soft break is a `<br>` and a blank line a new paragraph, which is
 * what the editor showed while it was being written.
 */
export function StorefrontRichText({ markdown, className }: StorefrontRichTextProps) {
  const blocks = parseMarkdown(markdown)
  if (blocks.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-3 text-[15px] leading-relaxed", className)}>
      {blocks.map((block, at) =>
        block.kind === "paragraph" ? (
          <p key={at}>
            {block.lines.map((line, index) => (
              <span key={index}>
                {index > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        ) : block.ordered ? (
          <ol key={at} className="flex list-decimal flex-col gap-1.5 pl-5">
            {block.items.map((item, index) => (
              <li key={index}>{renderInline(item)}</li>
            ))}
          </ol>
        ) : (
          <ul key={at} className="flex list-disc flex-col gap-1.5 pl-5">
            {block.items.map((item, index) => (
              <li key={index}>{renderInline(item)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
