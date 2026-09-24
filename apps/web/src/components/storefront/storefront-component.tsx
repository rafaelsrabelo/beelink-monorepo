// React
import type { ReactNode } from "react"

// Types
import type {
  BenefitRow,
  ContactField,
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
import { StorefrontContact } from "@harness-monorepo/ui/blocks/storefront/storefront-contact"
import { StorefrontHero } from "@harness-monorepo/ui/blocks/storefront/storefront-hero"
import { StorefrontHeading } from "@harness-monorepo/ui/blocks/storefront/storefront-heading"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// App
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { ContactFormLive } from "./contact-form-live"
import type { ContactCopy } from "./storefront-contact-copy"
import { StorefrontShelf } from "./storefront-shelf"

/**
 * What a contact form needs to send: the site, its WhatsApp and the sentences for a refusal. Null
 * in design mode's preview, where the form draws and sends nothing.
 */
export interface LiveContact {
  slug: string
  whatsappHref: string | null
  copy: ContactCopy
}

export interface StorefrontComponentProps {
  component: PublicComponent
  /** Every category the shop has. A CATEGORIES component draws these; nothing else reads them. */
  categories: readonly PublicProductCategory[]
  routes: StorefrontRoutes
  showPrice: boolean
  showBadge: boolean
  linkComponent?: LinkComponent
  /** Null in the preview: see `LiveContact`. */
  contact?: LiveContact | null
  messages: UiMessages
}

/**
 * One component of a band, drawn.
 *
 * Every kind but a banner drawn as cards — one picture, or any number shown as a grid — which
 * `StorefrontSections` keeps, because the cards are sized by the span of the cell they sit in. Its own file because the renderer that held this had
 * passed the line limit, and the seam falls here — how a band is laid out on one side, how one
 * thing draws on the other.
 */
export function StorefrontComponent({
  component,
  categories,
  routes,
  showPrice,
  showBadge,
  linkComponent,
  contact = null,
  messages,
}: StorefrontComponentProps): ReactNode {
  const link = linkComponent ? { linkComponent } : {}

  if (component.kind === "BANNER") {
    // Several pictures shown as a carousel, sized to the slice its span gives it. One picture, or a
    // grid, never gets here: `StorefrontSections` draws those as cards.
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
        span={component.span}
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

  if (component.kind === "CONTACT") {
    const fields = component.items as ContactField[]

    return contact ? (
      <ContactFormLive
        slug={contact.slug}
        componentId={component.id}
        title={component.title}
        subtitle={component.subtitle}
        fields={fields}
        whatsappHref={contact.whatsappHref}
        copy={contact.copy}
        messages={messages}
      />
    ) : (
      <StorefrontContact title={component.title} subtitle={component.subtitle} fields={fields} messages={messages} />
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
    <StorefrontShelf
      component={component}
      routes={routes}
      showPrice={showPrice}
      showBadge={showBadge}
      {...link}
      messages={messages}
    />
  )
}
