// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateInvitationView } from "@harness-monorepo/ui/lib/affiliates"
import { AffiliateRateLines } from "./affiliate-rate-lines"

export interface AffiliateInvitationSummaryProps {
  invitation: AffiliateInvitationView
  messages?: UiMessages
}

/**
 * What is on offer, before anything is asked (IMPULSEIA-104): whom the invite is for, the commission
 * — the table's rate and the products that pay their own — the shop's terms, and until when it works.
 */
export function AffiliateInvitationSummary({ invitation, messages = defaultMessages }: AffiliateInvitationSummaryProps) {
  const text = messages.affiliateInvite

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {invitation.storeLogoUrl ? <img src={invitation.storeLogoUrl} alt="" className="size-10 shrink-0 rounded-lg border object-cover" /> : null}
        <div className="flex min-w-0 flex-col">
          <p className="truncate font-semibold">{invitation.storeName}</p>
          <p className="text-muted-foreground truncate text-sm">{format(text.forEmail, { email: invitation.email })}</p>
        </div>
      </div>

      <section aria-labelledby="affiliate-invite-condition" className="bg-muted/50 flex flex-col gap-2 rounded-lg p-4">
        <h2 id="affiliate-invite-condition" className="text-sm font-semibold">
          {text.condition}
        </h2>
        <p className="text-lg font-semibold">{format(text.general, { rate: invitation.generalRate })}</p>
        <p className="text-muted-foreground text-sm">{text.generalHelp}</p>
        <AffiliateRateLines title={text.categories} lines={invitation.categories} />
        <AffiliateRateLines title={text.products} lines={invitation.products} />
      </section>

      <section aria-labelledby="affiliate-invite-terms" className="flex flex-col gap-2">
        <h2 id="affiliate-invite-terms" className="text-sm font-semibold">
          {text.terms}
        </h2>
        {invitation.termsText ? (
          // Focusable: a long text scrolls in its box, and a keyboard has to reach it to scroll it.
          <div tabIndex={0} className="max-h-48 overflow-y-auto rounded-lg border p-3 text-sm whitespace-pre-wrap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {invitation.termsText}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{text.termsNone}</p>
        )}
      </section>

      <p className="text-muted-foreground text-xs">{format(text.expires, { date: invitation.expires })}</p>
    </div>
  )
}
