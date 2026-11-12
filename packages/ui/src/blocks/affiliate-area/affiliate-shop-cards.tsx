// Libs
import { ChevronRightIcon, StoreIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateShopCardView } from "@harness-monorepo/ui/lib/affiliate-area"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AffiliateStatusBadge } from "../affiliates/affiliate-status-badge"

export interface AffiliateShopCardsProps {
  shops: readonly AffiliateShopCardView[]
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The shops an account sells for (IMPULSEIA-108), each with its standing and what it owes. */
export function AffiliateShopCards({ shops, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateShopCardsProps) {
  const text = messages.affiliateArea.shops

  return (
    <section aria-labelledby="affiliate-shops-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 id="affiliate-shops-title" className="text-2xl font-semibold">
          {text.title}
        </h1>
        {shops.length > 0 ? <p className="text-muted-foreground text-sm">{text.intro}</p> : null}
      </header>

      {shops.length === 0 ? (
        <div className="bg-shell-surface border-shell-border flex flex-col items-center gap-2 rounded-xl border px-4 py-10 text-center">
          <StoreIcon aria-hidden="true" className="text-muted-foreground size-6" />
          <p className="font-medium">{text.empty.title}</p>
          <p className="text-muted-foreground max-w-sm text-sm">{text.empty.body}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shops.map((shop) => (
            <li key={shop.key}>
              <Link
                href={shop.href}
                aria-label={format(text.open, { store: shop.name })}
                className="bg-shell-surface border-shell-border hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 rounded-xl border p-4 shadow-xs outline-none focus-visible:ring-2"
              >
                {shop.logoUrl ? (
                  <img src={shop.logoUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="bg-muted grid size-10 shrink-0 place-items-center rounded-md">
                    <StoreIcon aria-hidden="true" className="text-muted-foreground size-5" />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{shop.name}</span>
                    <AffiliateStatusBadge status={shop.status} messages={messages} />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {text.available}: <span className={cn("tabular-nums", shop.negative ? "text-destructive" : "text-foreground")}>{shop.available}</span> · {text.pending}:{" "}
                    <span className="text-foreground tabular-nums">{shop.pending}</span>
                  </span>
                </span>
                <ChevronRightIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
