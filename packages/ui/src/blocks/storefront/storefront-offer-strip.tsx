// React
import { useId } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BAND } from "./storefront-band"
import { StorefrontCopyButton } from "./storefront-copy-button"

export interface StorefrontOfferStripProps {
  /** The offer, as one sentence the screen built from the API's numbers. With a `code`, it ends where the code goes. */
  message: string
  /** A second sentence — the minimum the offer asks for; null or absent with none. */
  detail?: string | null
  /** The coupon's code, drawn after the sentence with a way to copy it. Never given for a visitor. */
  code?: string | null
  /** Where the offer leads: the shop's sign-up, or the cart with the coupon in its address. */
  action?: { label: string; href: string } | null
  /** The offer's link was pressed: the screen may count the offer as used. The link is followed either way. */
  onAction?: () => void
  /** Closes the strip. Absent, there is no button: a strip nobody can close is not offered one. */
  onDismiss?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** 44px on a phone, where it is pressed with a thumb; 36px beside a sentence on a wide screen. */
const ACTION = "inline-flex h-11 shrink-0 items-center rounded-full bg-shop-primary px-4 text-sm font-semibold text-shop-on-primary hover:opacity-90 shop-md:h-9"

/**
 * One slim strip under the shop's header, in the shop's own tint: what the shop offers whoever is
 * looking — an account to a visitor, the first-order benefit to a customer who has not ordered.
 *
 * In the page's flow and never over it: not fixed, not a dialog, so it covers nothing — the phone's
 * buy bar least of all — and a reader meets it once, between the header and the page. It is a
 * region with a name and not a `status`: it is there when the page arrives, and announces nothing.
 *
 * It says only what it is handed. Which offer is true of this visitor at this shop, and every number
 * in the sentence, are the screen's, read from the API.
 */
export function StorefrontOfferStrip({ message, detail = null, code = null, action = null, onAction, onDismiss, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOfferStripProps) {
  const text = messages.storefront.offers
  const codeId = useId()

  return (
    <section aria-label={text.region} className="w-full border-b border-shop-line bg-shop-primary-tint text-shop-on-background">
      <div className={cn(BAND, "flex items-start gap-2 py-2.5 shop-md:items-center")}>
        <div className="flex min-w-0 flex-1 flex-col gap-2 shop-md:flex-row shop-md:flex-wrap shop-md:items-center shop-md:gap-x-4">
          <p className="min-w-0 text-sm leading-snug break-words">
            <span className="font-medium">{message}</span>
            {code ? (
              <>
                {" "}
                <strong id={codeId} className="rounded-md border border-dashed border-shop-primary bg-shop-background px-2 py-0.5 font-mono text-sm font-bold tracking-wide whitespace-nowrap">
                  {code}
                </strong>
                .
              </>
            ) : null}
            {detail ? <> {detail}</> : null}
          </p>
          {code || action ? (
            <div className="flex flex-wrap items-center gap-2">
              {code ? <StorefrontCopyButton value={code} label={text.copy} doneLabel={text.copied} selectedLabel={text.copySelected} targetId={codeId} /> : null}
              {action ? (
                <Link href={action.href} onClick={onAction} className={ACTION}>
                  {action.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} aria-label={text.dismiss} className="-me-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-shop-fill shop-md:mt-0">
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </section>
  )
}
