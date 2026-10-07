// UI
import type { IntegrationProviderValue } from "@harness-monorepo/ui/lib/integrations"

// Locales
import type { IntegrationCardMessages, IntegrationProviderMessages, UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * What the Integrations page's cards say of a provider: the part every provider's slice of the copy
 * shares. A `.ts` beside the blocks, so each stays one component per file; a new provider is one
 * entry in the map.
 *
 * What only an account at a third party says — not set up here, a sandbox, a connection to mend — is
 * there for those that are one. The Meta Pixel and Google Analytics are not, and their cards never
 * stand in any of those.
 */
export type ProviderText = IntegrationCardMessages & Partial<IntegrationProviderMessages>

export function providerTextOf(messages: UiMessages, provider: IntegrationProviderValue): ProviderText {
  const texts: Record<IntegrationProviderValue, ProviderText> = { MELHOR_ENVIO: messages.integrations.melhorEnvio, ASAAS: messages.integrations.asaas, META_PIXEL: messages.integrations.metaPixel, GOOGLE_ANALYTICS: messages.integrations.googleAnalytics }
  return texts[provider]
}
