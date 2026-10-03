// Types
import type { OrderLabelCardView, OrderLabelFormValues } from "@harness-monorepo/ui/lib/label"

/** An order of SEDEX that can have its label bought, with the box Melhor Envio worked out. */
export const labelToBuy: OrderLabelCardView = { carrier: "Correios · SEDEX", blockers: [], balance: "R$ 100,00", label: null }

export const labelBox: OrderLabelFormValues = { weight: "600", length: "26", width: "20", height: "8", invoiceKey: "" }

export const labelGenerated: OrderLabelCardView = {
  ...labelToBuy,
  balance: "R$ 72,55",
  label: { status: "GENERATED", statusText: "Pronta para imprimir e postar. Custou R$ 27,45.", protocol: "ORD-202610020001", trackingCode: "ME23002OWZ7BR" },
}

export const labelBlocked: OrderLabelCardView = {
  ...labelToBuy,
  blockers: [{ text: "Informe o CPF ou CNPJ da loja, que vai como remetente.", href: "/admin/loja/integrations", linkLabel: "Abrir Integrações" }],
}
