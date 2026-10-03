// Libs
import { TruckIcon, type LucideIcon } from "lucide-react"

// UI
import type { IntegrationProviderValue } from "@harness-monorepo/ui/lib/integrations"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * How each third party is drawn and named across the Integrations pages: its icon, and its own slice
 * of the copy. A `.ts` beside the blocks, so each stays one component per file; a new provider is one
 * entry in each map.
 */
export const PROVIDER_ICONS: Record<IntegrationProviderValue, LucideIcon> = { MELHOR_ENVIO: TruckIcon }

export function providerTextOf(messages: UiMessages, provider: IntegrationProviderValue): UiMessages["integrations"]["melhorEnvio"] {
  const texts: Record<IntegrationProviderValue, UiMessages["integrations"]["melhorEnvio"]> = { MELHOR_ENVIO: messages.integrations.melhorEnvio }
  return texts[provider]
}
