import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutShopperSteps } from "./storefront-checkout-shopper-steps"

const own = { id: "OWN", title: "Entrega da loja", detail: "R$ 8,00 · chega em 30–50 min depois de sair da loja" }

const meta = {
  title: "Blocos/Vitrine/Checkout em etapas",
  component: StorefrontCheckoutShopperSteps,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }} className="flex flex-col gap-3">{Story()}</div>],
  args: {
    customer: {
      lines: ["Bia Cliente", "(85) 98765-4321"],
      complete: true,
      editHref: "#",
      addresses: [{ id: "casa", heading: "Casa · Bia Cliente", line: "Rua Tibúrcio Cavalcante, 1200 — Meireles — Fortaleza/CE" }],
      addAddressHref: "#",
    },
    choice: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: null, wayId: null },
    onChoiceChange: () => {},
    shipping: { delivery: true, pickup: true, ways: [own], note: own.detail },
    recipientDocument: null,
    paymentMethods: ["PIX", "MONEY", "CREDIT_CARD"],
    online: null,
    nothingToPay: null,
    deliveryIssue: null,
    alert: null,
    placeButton: (
      <button type="button" className="h-12 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary">
        Fechar pedido pelo WhatsApp
      </button>
    ),
    pending: false,
  },
} satisfies Meta<typeof StorefrontCheckoutShopperSteps>

export default meta
type Story = StoryObj<typeof meta>

/** Quem volta com endereço salvo: a entrega já concluída numa linha, direto no pagamento. */
export const DiretoNoPagamento: Story = {}

/** Sem endereço: a entrega aberta, o pagamento esperando. */
export const SemEndereco: Story = {
  args: {
    customer: { lines: ["Bia Cliente", "(85) 98765-4321"], complete: true, editHref: "#", addresses: [], addAddressHref: "#" },
    choice: { fulfillment: "DELIVERY", addressId: null, paymentMethod: null, wayId: null },
    shipping: null,
    deliveryIssue: "Para receber em casa, preencha o endereço de entrega.",
  },
}

/** A loja não chega ao endereço: a entrega volta a abrir sozinha. */
export const ForaDoRaio: Story = {
  args: {
    shipping: { delivery: true, pickup: true, ways: [], note: "A loja não entrega neste endereço: ele fica a 14 km, e a entrega vai até 8 km." },
    deliveryIssue: "A loja não entrega neste endereço: ele fica a 14 km, e a entrega vai até 8 km.",
  },
}
