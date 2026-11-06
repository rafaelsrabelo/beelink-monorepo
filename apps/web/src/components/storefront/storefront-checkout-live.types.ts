// Types
import type { CustomerProfile, CustomerPurchase, PaymentMethod, PublicProductDetail, StorefrontPaymentOptions, StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { ServedOffers } from "@/lib/cart-offers"
import type { ServedQuote } from "@/lib/cart-pricing"
import type { CheckoutIdentityState } from "@/lib/checkout-identity"

export interface StorefrontCheckoutLiveProps {
  slug: string
  /** The products the cart named when the page was served, priced by the catalogue. */
  products: readonly PublicProductDetail[]
  /** Back to the shelf, once the order is sent. */
  continueHref: string
  shopName: string
  /** The shop's WhatsApp as `wa.me` wants it, digits only; null when it has none. */
  whatsapp: string | null
  /** The shop's words for its addresses: an order charged online leads to its payment screen, whose address they spell. */
  routeWords: StorefrontRouteWords
  /** The methods the shop settles by on delivery or at pickup, in its own order. */
  paymentMethods: readonly PaymentMethod[]
  /** What the shop charges online, and whether paying on delivery stands (BEELINK-205); absent, the checkout of before. */
  paymentOptions?: StorefrontPaymentOptions
  /** The signed-in shopper's record at this shop; null for a visitor, who is asked to sign in to order. */
  shopper: CustomerProfile | null
  /**
   * Sign in, sign up, change details and add an address — each coming back to this checkout — and the
   * checkout's own address, which an address saved from it comes back to.
   */
  identityHrefs: { signInHref: string; signUpHref: string; editHref: string; addAddressHref: string; checkoutHref: string }
  /** The cart's page: the bag in the bar and "Editar carrinho" lead back to it, with the coupon. */
  cartHref: string
  /** Why the address last sent from the checkout was refused, already a sentence: its form opens again to say it. */
  addressError?: string | null
  /** A visitor's "who is buying" as the checkout's address left it (the e-mail, what to say); absent, a visitor is sent to sign in, as before. */
  identity?: CheckoutIdentityState | null
  /** A visitor already identified: their purchase session — what they typed, the address they gave. Null for a shopper or an unidentified visitor. */
  purchase?: CustomerPurchase | null
  /** An address just saved on the way from this checkout, to deliver to; null or not the shopper's, the default. */
  deliverTo?: string | null
  /** The cart's price as the page was served with it, so the summary is in the HTML; null and the browser asks. */
  served?: ServedQuote | null
  /** The shopper's offers for this cart as the page was served with them, so the list is in the HTML; null and the browser asks. */
  servedOffers?: ServedOffers | null
  /** A visitor's checkout alone: what the shop's first-purchase coupon gives, in a sentence with no code (BEELINK-311); null says nothing. */
  signedOutBenefit?: string | null
  /** The coupon the page's address named (`?cupom=`), to be checked on arrival; null with none. */
  coupon?: string | null
  locale: string
  messages: UiMessages
}
