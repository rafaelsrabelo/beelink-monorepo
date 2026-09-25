// UI
import { withoutFirstList } from "@harness-monorepo/ui/lib/markdown"
import type { SpecRow } from "@harness-monorepo/ui/lib/product-specs"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PRODUCT_DESCRIPTION_ID, PRODUCT_SECTION_HEADING, StorefrontProductSection } from "./storefront-product-section"
import { StorefrontRichText } from "./storefront-rich-text"
import { StorefrontSpecTable } from "./storefront-spec-table"

export interface StorefrontProductDetailsProps {
  /** The product's Markdown; its first bulleted list is already "Sobre este item" and is left out. */
  description: string | null
  specs: readonly SpecRow[]
  messages?: UiMessages
}

/**
 * 5b's "Descrição do produto" beside "Informações técnicas", stacked on a phone. Either stands alone
 * when the other has nothing to say, across the whole width; with neither, there is no section.
 * It is `#descricao`, where "Ver descrição completa" lands.
 */
export function StorefrontProductDetails({ description, specs, messages = defaultMessages }: StorefrontProductDetailsProps) {
  const text = messages.storefront
  const described = description ? withoutFirstList(description).length > 0 : false
  if (!described && specs.length === 0) return null

  return (
    <StorefrontProductSection id={PRODUCT_DESCRIPTION_ID} className="pb-12">
      <div className={cn("grid gap-12", described && specs.length > 0 && "shop-lg:grid-cols-2")}>
        {described && description ? (
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className={PRODUCT_SECTION_HEADING}>{text.descriptionHeading}</h2>
            <StorefrontRichText markdown={description} skipFirstList className="text-[15px] leading-[1.6] text-shop-on-background" />
          </div>
        ) : null}
        {specs.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className={PRODUCT_SECTION_HEADING}>{text.specsHeading}</h2>
            <StorefrontSpecTable rows={specs} />
          </div>
        ) : null}
      </div>
    </StorefrontProductSection>
  )
}
