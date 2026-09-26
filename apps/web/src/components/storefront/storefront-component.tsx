// React
import type { ReactNode } from "react"

// Types
import type {
  BenefitRow,
  ContactField,
  CountdownEnd,
  FaqItem,
  PublicCallToActionButton,
  PublicComponent,
  PublicImageTextMedia,
  PublicProductCategory,
} from "@harness-monorepo/contracts"

// UI
import { BenefitIcon } from "@harness-monorepo/ui/blocks/design/benefit-icons"
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontBenefits } from "@harness-monorepo/ui/blocks/storefront/storefront-benefits"
import { StorefrontCallToAction } from "@harness-monorepo/ui/blocks/storefront/storefront-call-to-action"
import { StorefrontContact } from "@harness-monorepo/ui/blocks/storefront/storefront-contact"
import { StorefrontFaq } from "@harness-monorepo/ui/blocks/storefront/storefront-faq"
import { StorefrontHeading } from "@harness-monorepo/ui/blocks/storefront/storefront-heading"
import { StorefrontImageText } from "@harness-monorepo/ui/blocks/storefront/storefront-image-text"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// App
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { ContactFormLive } from "./contact-form-live"
import { StorefrontBannerBlock } from "./storefront-banner-block"
import { StorefrontCountdownLive } from "./storefront-countdown-live"
import { StorefrontFeaturedBlock } from "./storefront-featured-block"
import { StorefrontCategoriesBlock } from "./storefront-categories-block"
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
  /** "Adicionar ao carrinho" on each card of a showcase. */
  quickAdd?: boolean
  linkComponent?: LinkComponent
  /** Null in the preview: see `LiveContact`. */
  contact?: LiveContact | null
  /** In an edge-to-edge band: a carousel's pictures keep square corners, to reach the edges. */
  bleed?: boolean
  /** Whether a cart can be reached from this page: a landing without the shop's header cannot. */
  cartReachable?: boolean
  /** Design mode's preview, whose buttons put nothing in a cart. */
  editing?: boolean
  messages: UiMessages
}

/**
 * One component of a band, drawn.
 *
 * Every kind but a banner drawn as cards — one picture, or any number shown as a grid — which
 * `StorefrontSections` keeps, because the cards are sized by the span of the cell they sit in. Its
 * own file because the renderer that held this had passed the line limit, and the seam falls here —
 * how a band is laid out on one side, how one thing draws on the other.
 */
export function StorefrontComponent({
  component,
  categories,
  routes,
  showPrice,
  showBadge,
  quickAdd = false,
  linkComponent,
  contact = null,
  bleed = false,
  cartReachable = true,
  editing = false,
  messages,
}: StorefrontComponentProps): ReactNode {
  const link = linkComponent ? { linkComponent } : {}

  // Exhaustive, and a kind this build does not know draws nothing: a cached page, or a newer API,
  // may serve one, and falling through to a shelf would draw its items as product cards.
  switch (component.kind) {
    case "BANNER":
      return <StorefrontBannerBlock component={component} bleed={bleed} {...link} messages={messages} />

    case "CATEGORIES":
      return (
        <StorefrontCategoriesBlock component={component} categories={categories} routes={routes} {...link} messages={messages} />
      )

    case "BENEFITS":
      return (
        <StorefrontBenefits
          layout={component.display === "CARDS" ? "CARDS" : "INLINE"}
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

    case "CONTACT": {
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

    case "HEADING":
      return (
        <StorefrontHeading
          title={component.title}
          subtitle={component.subtitle}
          align={component.align ?? defaultAlignOf(component.kind)}
        />
      )

    case "TEXT": {
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

    case "CALL_TO_ACTION":
      return (
        <StorefrontCallToAction
          layout={component.display === "CARD" ? "CARD" : "BAND"}
          title={component.title}
          body={component.body}
          button={(component.items as PublicCallToActionButton[])[0] ?? null}
          bleed={bleed}
          {...link}
        />
      )

    case "IMAGE_TEXT":
      return (
        <StorefrontImageText
          layout={component.display === "IMAGE_RIGHT" ? "IMAGE_RIGHT" : "IMAGE_LEFT"}
          title={component.title}
          body={component.body}
          media={(component.items as PublicImageTextMedia[])[0] ?? null}
          span={component.span}
          {...link}
        />
      )

    case "FEATURED_PRODUCT":
      return (
        <StorefrontFeaturedBlock
          component={component}
          routes={routes}
          cartReachable={cartReachable}
          editing={editing}
          {...link}
          messages={messages}
        />
      )

    case "COUNTDOWN": {
      const [end] = component.items as CountdownEnd[]
      if (!end) return null
      return (
        <StorefrontCountdownLive
          layout={component.display === "BLOCK" ? "BLOCK" : "BAND"}
          title={component.title}
          subtitle={component.subtitle}
          endsAt={end.endsAt}
          bleed={bleed}
          editing={editing}
          messages={messages}
        />
      )
    }

    case "FAQ":
      return (
        <StorefrontFaq id={component.id} title={component.title} subtitle={component.subtitle} items={component.items as FaqItem[]} />
      )

    case "PRODUCTS":
      return (
        <StorefrontShelf
          component={component}
          routes={routes}
          showPrice={showPrice}
          showBadge={showBadge}
          quickAdd={quickAdd}
          {...link}
          messages={messages}
        />
      )

    // Drawn above the header by the window, never among the bands: see `announcementOf`.
    case "ANNOUNCEMENT":
      return null

    // A kind this build does not know draws nothing. `satisfies never` makes a kind added to the
    // contract without a case above fail the build here, rather than draw nothing in the shop.
    default:
      return (component.kind satisfies never) && null
  }
}
