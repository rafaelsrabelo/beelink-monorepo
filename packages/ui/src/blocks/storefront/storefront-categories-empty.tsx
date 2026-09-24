// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCategoriesEmptyProps {
  /** Where to send someone instead. Without it the sentence stands alone. */
  catalogHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A shop with no category to show. It is allowed to sell without categories, and a block of them is
 * still somewhere a visitor can land: a sentence and a door, never a blank space. The grid and the
 * rail say the same thing.
 */
export function StorefrontCategoriesEmpty({
  catalogHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCategoriesEmptyProps) {
  const text = messages.storefront

  return (
    <section className="flex w-full flex-col items-center gap-2 py-16 text-center">
      <p className="font-medium">{text.categoriesEmpty}</p>
      {catalogHref ? (
        <Link
          href={catalogHref}
          className="mt-2 rounded-xl px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
        >
          {text.catalogTitle}
        </Link>
      ) : null}
    </section>
  )
}
