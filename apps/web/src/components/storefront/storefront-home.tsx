// App
import { StorefrontAffiliateArrival } from "@/components/storefront/affiliate/storefront-affiliate-arrival"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { StorefrontOffers } from "@/components/storefront/storefront-offers"
import { contactCopyOf } from "@/components/storefront/storefront-contact-copy"
import { StorefrontSections } from "@/components/storefront/storefront-sections"
import { orderHrefOf } from "@/components/storefront/storefront-links"
import { getMessages } from "@/lib/locale"
import { shopperAt } from "@/lib/shopper"
import { navigationAt, paymentOptionsAt, type ServedShop } from "@/lib/storefront-data"
import { installmentTermsOf } from "@/lib/storefront-installments"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontHomeProps {
  slug: string
  /** The shop as `shopAt` served it, and on the air: a page off the air draws its notice instead. */
  store: ServedShop
  /**
   * The affiliate an address names, when the home is drawn at an affiliate's link and the link
   * credits them (IMPULSEIA-105): the arrival is told from it, and the card is drawn for it. Null at
   * the shop's own address, and at a link that credits nobody.
   */
  arrivedBy?: string | null
}

/**
 * A shop's front door: the showcases the shopkeeper arranged, each with a way through to the rest.
 *
 * One component for the two addresses that draw it — the shop's own (`/<shop>`) and an affiliate's
 * link (`/<shop>/<name>`, IMPULSEIA-105), which shows the same home at the link's address so the
 * name stays where the visitor can read it. Two copies of a landing drift apart.
 */
export async function StorefrontHome({ slug, store, arrivedBy = null }: StorefrontHomeProps) {
  const [{ ui, web }, { categories, onSale }, paymentOptions, shopper] = await Promise.all([
    getMessages(),
    // A site has no catalogue to ask for. The empty answer is what its page draws with anyway.
    store.type === "INSTITUTIONAL" ? { categories: [], onSale: false } : navigationAt(slug),
    paymentOptionsAt(slug),
    shopperAt(slug),
  ])
  const installments = installmentTermsOf(paymentOptions)

  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings

  return (
    <>
      {arrivedBy ? <StorefrontAffiliateArrival slug={slug} name={arrivedBy} /> : null}
      <StorefrontFrame
        store={store}
        categories={categories}
        onSale={onSale}
        // No pitch band. It used to sit right under the cover — the shop's name, a line about the
        // shop and a WhatsApp button — and the shop owner was right that it reads as a profile page
        // rather than a landing page: three lines of prose between the cover and the first thing for
        // sale. The name is in the header and the WhatsApp is in the footer and on every product.
        // No cover and no promises band from the frame: on this page they are blocks, and which one
        // comes first is the shopkeeper's answer rather than this file's.
        year={new Date().getFullYear()}
        shopper={shopper}
        // Under the header: the invitation to open an account, or a shopper's first-order benefit.
        notice={<StorefrontOffers store={store} messages={ui} />}
        arrivedBy={arrivedBy}
        messages={ui}
        blocks={
          <>
            {/*
              The page's heading, for the accessibility tree only. A landing page whose heading is a
              logo is a page a screen reader opens with no idea whose shop it is.
            */}
            <h1 className="sr-only">{store.name}</h1>
            <StorefrontSections
              sections={store.sections}
              primary={store.colors.primary}
              categories={categories}
              routes={routes}
              showPrice={layout.showProductPrice ?? true}
              {...(installments ? { installments } : {})}
              showBadge={layout.showProductBadges ?? true}
              showRating={layout.showProductRating ?? true}
              quickAdd={layout.showQuickAdd ?? true}
              contact={{ slug, whatsappHref: orderHrefOf(store) ?? null, copy: contactCopyOf(web) }}
              messages={ui}
            />
          </>
        }
      />
    </>
  )
}
