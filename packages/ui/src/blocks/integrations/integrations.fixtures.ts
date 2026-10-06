// Block
import type { AsaasCardView, IntegrationCardView, MelhorEnvioCardView, PaymentSettingsFormValues, ShippingServiceView, ShippingSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"

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

/** Stand-ins for the brands' marks: the real files are the app's, and reach a block by prop. */
export const MELHOR_ENVIO_LOGO = "/brand/integrations/melhor-envio-icon.png"
export const ASAAS_LOGO = "/brand/integrations/asaas-icon.png"

/** A shop that connected neither, on a sandbox installation. Melhor Envio's way in begins its authorization. */
export const melhorEnvioCard: IntegrationCardView = {
  provider: "MELHOR_ENVIO",
  logoSrc: MELHOR_ENVIO_LOGO,
  href: "/admin/lessari/integrations/melhor-envio",
  connectHref: "/api/stores/lessari/integrations/melhor-envio/connect",
  connectBy: "authorization",
  connection: { state: "disconnected", account: null, sandbox: true },
}

/** Connecting Asaas is typing a key on its own page: both ways lead there. */
export const asaasCard: IntegrationCardView = {
  provider: "ASAAS",
  logoSrc: ASAAS_LOGO,
  href: "/admin/lessari/integrations/asaas",
  connectHref: "/admin/lessari/integrations/asaas",
  connectBy: "page",
  connection: { state: "disconnected", account: null, sandbox: true },
}

/** A shop connected in the sandbox. No fixture holds a key: the card takes none as a prop. */
export const asaasConnected: AsaasCardView = {
  available: true,
  status: "CONNECTED",
  sandbox: true,
  account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" },
  webhook: "REGISTERED",
  connectedAt: "2026-10-05T12:00:00.000Z",
  signUpHref: "https://sandbox.asaas.com",
}

export const asaasDisconnected: AsaasCardView = { ...asaasConnected, status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }

export const payments: PaymentSettingsFormValues = { pix: true, card: true, maxInstallments: 3, offline: true }
