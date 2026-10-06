// UI
import type { IntegrationProviderValue } from "@harness-monorepo/ui/lib/integrations"

// Locales
import type { IntegrationProviderMessages, UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * What the Integrations page's cards say of a provider: the part every provider's slice of the copy
 * shares. A `.ts` beside the blocks, so each stays one component per file; a new provider is one
 * entry in the map.
 */
export function providerTextOf(messages: UiMessages, provider: IntegrationProviderValue): IntegrationProviderMessages {
  const texts: Record<IntegrationProviderValue, IntegrationProviderMessages> = { MELHOR_ENVIO: messages.integrations.melhorEnvio, ASAAS: messages.integrations.asaas }
  return texts[provider]
}
