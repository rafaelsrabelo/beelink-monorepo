// Libs
import { CreditCardIcon, TruckIcon, type LucideIcon } from "lucide-react"

// UI
import type { IntegrationProviderValue } from "@harness-monorepo/ui/lib/integrations"

// Locales
import type { IntegrationProviderMessages, UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * How each third party is drawn and named across the Integrations pages: its icon, and its own slice
 * of the copy. A `.ts` beside the blocks, so each stays one component per file; a new provider is one
 * entry in each map.
 */
export const PROVIDER_ICONS: Record<IntegrationProviderValue, LucideIcon> = { MELHOR_ENVIO: TruckIcon, ASAAS: CreditCardIcon }

/** What the list and the catalogue say of a provider: the part every provider's slice shares. */
export function providerTextOf(messages: UiMessages, provider: IntegrationProviderValue): IntegrationProviderMessages {
  const texts: Record<IntegrationProviderValue, IntegrationProviderMessages> = { MELHOR_ENVIO: messages.integrations.melhorEnvio, ASAAS: messages.integrations.asaas }
  return texts[provider]
}
