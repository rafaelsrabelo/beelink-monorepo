// UI
import { installmentOf, type StorefrontInstallmentTerms } from "@harness-monorepo/ui/lib/installments"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { formatCents } from "./storefront-price"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontInstallmentsProps {
  priceCents: number
  /** The shop's terms; the line is drawn only for a price they split in two or more. */
  terms: StorefrontInstallmentTerms
  locale: string
  currency?: string
  /** `card` under a shelf card's price, `product` under the product page's. */
  size?: "card" | "product"
  className?: string
  messages?: UiMessages
}

/**
 * "em até 6x de R$ 14,98 sem juros", under a price. Nothing at all for a price the shop charges in
 * full only: a line reading "1x" is noise, and its absence is what keeps the others worth reading.
 */
export function StorefrontInstallments({ priceCents, terms, locale, currency = "BRL", size = "card", className, messages = defaultMessages }: StorefrontInstallmentsProps) {
  const split = installmentOf(priceCents, terms)
  if (!split) return null

  return (
    <p className={cn("text-shop-muted", size === "card" ? "text-xs" : "text-sm", className)}>
      {format(messages.storefront.installments, { count: String(split.count), amount: formatCents(split.amountCents, locale, currency) })}
    </p>
  )
}
