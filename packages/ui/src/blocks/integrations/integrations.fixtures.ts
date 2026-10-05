// Block
import type { IntegrationOptionView, IntegrationRowView, MelhorEnvioCardView, ShippingServiceView, ShippingSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"

export const connected: MelhorEnvioCardView = {
  available: true,
  status: "CONNECTED",
  sandbox: true,
  account: { name: "Loja Lessari", email: "envios@lessari.com.br" },
  wallet: { state: "ready", balance: "R$ 1.624,90" },
}

export const services: ShippingServiceView[] = [
  { id: 1, name: "PAC", company: "Correios" },
  { id: 2, name: "SEDEX", company: "Correios" },
  { id: 3, name: ".Package", company: "Jadlog" },
  { id: 4, name: ".Com", company: "Jadlog" },
]

export const shipping: ShippingSettingsFormValues = { serviceIds: [1, 2, 3], handlingDays: "1", weight: "500", length: "20", width: "15", height: "10", senderDocument: "11222333000181", senderStateRegister: "" }

export const melhorEnvioRow: IntegrationRowView = { provider: "MELHOR_ENVIO", status: "CONNECTED", account: "Loja Lessari", sandbox: true, href: "/admin/lessari/integrations/melhor-envio" }

export const melhorEnvioOption: IntegrationOptionView = {
  provider: "MELHOR_ENVIO",
  state: "available",
  connectHref: "/api/stores/lessari/integrations/melhor-envio/connect",
  connectBy: "authorization",
  href: "/admin/lessari/integrations/melhor-envio",
}

export const asaasRow: IntegrationRowView = { provider: "ASAAS", status: "CONNECTED", account: "Lessari Moda LTDA", sandbox: true, href: "/admin/lessari/integrations/asaas" }

/** Connecting Asaas is typing a key on its own page: both ways lead there. */
export const asaasOption: IntegrationOptionView = {
  provider: "ASAAS",
  state: "available",
  connectHref: "/admin/lessari/integrations/asaas",
  connectBy: "page",
  href: "/admin/lessari/integrations/asaas",
}
