// React
import type { ReactNode } from "react"

// Types
import type {
  BenefitRow,
  PublicBannerSlide,
  PublicComponent,
  PublicProductCategory,
} from "@harness-monorepo/contracts"

// UI
import { BenefitIcon } from "@harness-monorepo/ui/blocks/design/benefit-icons"
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontBenefits } from "@harness-monorepo/ui/blocks/storefront/storefront-benefits"
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontHero } from "@harness-monorepo/ui/blocks/storefront/storefront-hero"
import { StorefrontHeading } from "@harness-monorepo/ui/blocks/storefront/storefront-heading"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// App
import type { HomeBand } from "@/lib/storefront-data"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontComponentProps {
  component: PublicComponent
  /** The product rails, already loaded. A PRODUCTS component draws these and nothing else. */
  bands: readonly HomeBand[]
  /** Every category the shop has. A CATEGORIES component draws these; nothing else reads them. */
  categories: readonly PublicProductCategory[]
  routes: StorefrontRoutes
  showPrice: boolean
  showBadge: boolean
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * One component of a band, drawn.
 *
 * Every kind but the poster, which is not drawn one at a time: a run of posters is one showcase
 * row, and the row is what decides their columns, so `StorefrontSections` keeps that case. Its
 * own file because the renderer that held this had passed the line limit, and the seam falls
 * here — how bands and runs are laid out on one side, how one thing draws on the other.
 */
export function StorefrontComponent({
  component,
  bands,
  categories,
  routes,
  showPrice,
  showBadge,
  linkComponent,
  messages,
}: StorefrontComponentProps): ReactNode {
  const link = linkComponent ? { linkComponent } : {}

  if (component.kind === "BANNER") {
    // One picture is a poster; several are a carousel. The count is the whole of that decision —
    // making a carousel used to mean creating two banners and hoping they stayed adjacent.
    return (
      <StorefrontHero
        items={(component.items as PublicBannerSlide[]).map((slide) => ({
          id: slide.id,
          imageUrl: slide.imageUrl,
          title: slide.title,
          subtitle: slide.subtitle,
          href: slide.href,
          external: slide.external,
        }))}
        // The band owns the measure now, so a hero never adds its own: doing both would inset a
        // cover inside a band that is already inset.
        width="FULL"
        {...link}
        messages={messages}
      />
    )
  }

  if (component.kind === "CATEGORIES") {
    return (
      <div className="flex flex-col gap-4">
        {component.title ? (
          <StorefrontHeading title={component.title} subtitle={component.subtitle} />
        ) : null}
        <StorefrontCategoryGrid
          categories={categories.map((category) => ({
            id: category.id,
            slug: category.slug,
            name: category.name,
            imageUrl: category.imageUrl,
            description: category.description,
            productCount: category.productCount,
          }))}
          href={routes.category}
          catalogHref={routes.catalog()}
          locale="pt-BR"
          {...(component.columns ? { columns: component.columns } : {})}
          {...link}
          messages={messages}
        />
      </div>
    )
  }

  if (component.kind === "BENEFITS") {
    return (
      <StorefrontBenefits
        items={(component.items as BenefitRow[]).map((row) => ({
          id: row.id,
          title: row.title,
          detail: row.detail,
          // The name is turned back into a glyph here and not in the block: a design system that
          // knew "qr-code" means PIX would be a design system that knows what PIX is.
          icon: <BenefitIcon name={row.icon} />,
        }))}
      />
    )
  }

  if (component.kind === "HEADING") {
    return (
      <StorefrontHeading
        title={component.title}
        subtitle={component.subtitle}
        align={component.align ?? defaultAlignOf(component.kind)}
      />
    )
  }

  if (component.kind === "TEXT") {
    const align = component.align ?? defaultAlignOf(component.kind)

    // `whitespace-pre-line`, because a shopkeeper's paragraph breaks are the only formatting this
    // field has. Rendering it as one run would silently join what they typed as two. The measure
    // stays at 70ch whichever side it sits on: a centred paragraph is centred as a block, not as
    // lines the full width of the page.
    return (
      <p
        className={cn(
          "max-w-[70ch] text-base whitespace-pre-line opacity-90",
          align === "CENTER" && "mx-auto text-center",
          align === "RIGHT" && "ml-auto text-right",
        )}
      >
        {component.body}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {bands.map((band) => (
        <StorefrontProductRail
          key={band.kind === "all" ? "all" : band.category.id}
          products={band.products}
          productHref={routes.product}
          // The shopkeeper's own word for their shelf, falling back to the platform's. A category
          // band keeps the category's name: renaming that is renaming the category, everywhere it
          // appears.
          title={
            band.kind === "all"
              ? (component.title ?? messages.storefront.catalogTitle)
              : band.category.name
          }
          {...(band.kind === "category" && band.category.description
            ? { label: band.category.description }
            : {})}
          seeAllHref={band.kind === "all" ? routes.catalog() : routes.category(band.category.slug)}
          locale="pt-BR"
          showPrice={showPrice}
          showBadge={showBadge}
          {...link}
          messages={messages}
        />
      ))}
    </div>
  )
}
