// Block
import type { MelhorEnvioCardView, ShippingServiceView, ShippingSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"

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

export const shipping: ShippingSettingsFormValues = { serviceIds: [1, 2, 3], handlingDays: "1", weight: "500", length: "20", width: "15", height: "10" }
