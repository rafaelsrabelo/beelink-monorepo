// UI
import type { MarkdownInline } from "@harness-monorepo/ui/lib/markdown"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontInline } from "./storefront-rich-text"

export interface StorefrontAboutItemProps {
  /** The description's first bulleted list, each item with its marks. */
  items: readonly MarkdownInline[][]
  /** Where the rest of the description is; absent when the list was all of it. */
  moreHref?: string
  messages?: UiMessages
}

/**
 * 5b's "Sobre este item": the description's first list, each bullet keeping the bold lead the
 * shopkeeper gave it, and "Ver descrição completa ›" down to the rest.
 */
export function StorefrontAboutItem({ items, moreHref, messages = defaultMessages }: StorefrontAboutItemProps) {
  const text = messages.storefront

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[17px] font-extrabold">{text.aboutItem}</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.5]">
        {items.map((item, index) => (
          <li key={index}>
            <StorefrontInline nodes={item} />
          </li>
        ))}
      </ul>
      {moreHref ? (
        <a href={moreHref} className="self-start text-[14px] font-semibold text-shop-primary-ink hover:underline">
          {text.fullDescription}
          <span aria-hidden="true"> ›</span>
        </a>
      ) : null}
    </div>
  )
}
