// Libs
import { CheckIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAffiliateJoinSentProps {
  title: string
  /** The shop's message after sending, its marks filled in. */
  message: string
  homeHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The answer to an application (plan 2026-11-14): what happens next, the first step already done. */
export function StorefrontAffiliateJoinSent({ title, message, homeHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontAffiliateJoinSentProps) {
  const text = messages.affiliateJoin.sent

  return (
    <section role="status" aria-label={title} className="bg-shop-background border-shop-line flex flex-col gap-5 rounded-2xl border p-6 shadow-sm">
      <span className="bg-shop-primary text-shop-on-primary flex size-14 items-center justify-center rounded-full">
        <CheckIcon aria-hidden="true" className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-shop-text text-2xl font-extrabold break-words">{title}</h2>
        <p className="text-shop-muted break-words">{message}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {text.steps.map((step, index) => (
          <li key={index} className="text-shop-text flex items-center gap-3 text-sm">
            {index === 0 ? (
              <span className="bg-shop-primary text-shop-on-primary flex size-6 shrink-0 items-center justify-center rounded-full">
                <CheckIcon aria-hidden="true" className="size-3.5" />
              </span>
            ) : (
              <span aria-hidden="true" className="border-shop-line-strong size-6 shrink-0 rounded-full border-2" />
            )}
            <span className={index === 0 ? "font-semibold" : undefined}>{step}</span>
          </li>
        ))}
      </ol>
      <Link href={homeHref} className="border-shop-line-strong text-shop-text flex min-h-12 items-center justify-center rounded-xl border font-semibold">
        {text.back}
      </Link>
    </section>
  )
}
