/**
 * The panel's integrations query keys: one shop's Melhor Envio connection, its wallet and its
 * settings, and its Asaas connection and the ways it is paid.
 */
export const integrationKeys = {
  all: ["integrations"] as const,
  melhorEnvio: (slug: string) => [...integrationKeys.all, slug, "melhor-envio"] as const,
  connection: (slug: string) => [...integrationKeys.melhorEnvio(slug), "connection"] as const,
  account: (slug: string) => [...integrationKeys.melhorEnvio(slug), "account"] as const,
  settings: (slug: string) => [...integrationKeys.melhorEnvio(slug), "settings"] as const,
  asaas: (slug: string) => [...integrationKeys.all, slug, "asaas"] as const,
  asaasConnection: (slug: string) => [...integrationKeys.asaas(slug), "connection"] as const,
  asaasSettings: (slug: string) => [...integrationKeys.asaas(slug), "settings"] as const,
}
