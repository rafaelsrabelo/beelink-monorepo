// Types
import type { StorefrontPaymentOptions } from "@harness-monorepo/contracts"

// UI
import type { StorefrontInstallmentTerms } from "@harness-monorepo/ui/lib/installments"

/**
 * The terms a price is split by on the shop's pages — undefined when the shop charges no card
 * online, or only in full: its products then say nothing of instalments, anywhere.
 */
export function installmentTermsOf(options: StorefrontPaymentOptions): StorefrontInstallmentTerms | undefined {
  const online = options.online
  if (!online?.card || online.maxInstallments < 2) return undefined

  return { maxInstallments: online.maxInstallments, minimumChargeCents: online.minimumChargeCents, minimumInstallmentCents: online.minimumInstallmentCents }
}
