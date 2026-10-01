// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { LandingProductValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BeelinkLogo } from "./beelink-logo"
import { LANDING_ANCHORS } from "./landing-header"
import { LANDING_CONTAINER } from "./landing-styles"

export interface LandingFooterProps {
  termsHref: string
  privacyHref: string
  /** The year the rights line says: the screen's clock, never this block's. */
  year: number
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PRODUCTS: readonly LandingProductValue[] = ["store", "checkout", "chat", "shipping", "marketing"]
const COLUMN = "flex flex-col gap-2.5"
const LINK = "text-brand-text hover:underline"

/**
 * The page's foot: the brand, the five solutions — each leading to where the page describes it —
 * the couriers' sign-up, and the two legal texts. Only what has somewhere to lead: the design's
 * help centre, contact and couriers' terms have no page yet, and a link to nowhere is worse than none.
 */
export function LandingFooter({ termsHref, privacyHref, year, linkComponent: Link = AnchorLink, messages = defaultMessages }: LandingFooterProps) {
  const text = messages.landing.footer
  const products = messages.landing.products

  return (
    <footer className="mt-14 border-t-[1.5px] border-brand-line md:mt-20">
      <div className={cn(LANDING_CONTAINER, "flex flex-wrap gap-x-20 gap-y-10 py-14 text-[15px]")}>
        <div className="flex max-w-[300px] flex-col gap-3.5">
          <BeelinkLogo label={messages.landing.brand} className="h-9 self-start" />
          <span className="leading-normal text-brand-muted">{text.tagline}</span>
        </div>
        <nav aria-label={text.solutions} className={COLUMN}>
          <b>{text.solutions}</b>
          {PRODUCTS.map((product) => (
            <a key={product} href={LANDING_ANCHORS.ecosystem} className={LINK}>
              {products[product].name}
            </a>
          ))}
        </nav>
        <nav aria-label={text.couriers} className={COLUMN}>
          <b>{text.couriers}</b>
          <a href={LANDING_ANCHORS.couriers} className={LINK}>
            {text.courierSignUp}
          </a>
        </nav>
        <nav aria-label={text.company} className={COLUMN}>
          <b>{text.company}</b>
          <Link href={termsHref} className={LINK}>
            {text.terms}
          </Link>
          <Link href={privacyHref} className={LINK}>
            {text.privacy}
          </Link>
        </nav>
        <span className="text-brand-muted md:ml-auto md:self-end">{format(text.rights, { year: String(year) })}</span>
      </div>
    </footer>
  )
}
