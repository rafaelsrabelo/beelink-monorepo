import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutChoices } from "./storefront-checkout-choices"

const meta = {
  title: "Blocos/Vitrine/Como receber e pagar",
  component: StorefrontCheckoutChoices,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 320 }}>{Story()}</div>],
  args: {
    value: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: "PIX", wayId: null },
    onChange: () => {},
    addresses: [{ id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" }],
    addHref: "#",
    paymentMethods: ["PIX", "MONEY", "CREDIT_CARD", "DEBIT_CARD"],
  },
} satisfies Meta<typeof StorefrontCheckoutChoices>

export default meta
type Story = StoryObj<typeof meta>

/** Entrega no único endereço salvo, Pix escolhido. */
export const Entrega: Story = {}

/** Vários endereços salvos: a entrega oferece a escolha, com o padrão marcado. */
export const VariosEnderecos: Story = {
  args: {
    addresses: [
      { id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" },
      { id: "trabalho", heading: "Trabalho · Recepção", line: "Av. Brigadeiro Faria Lima, 3477 — Itaim Bibi — São Paulo/SP" },
    ],
  },
}

/** Sem endereço salvo: a entrega fica indisponível, com o caminho para cadastrar. */
export const SemEndereco: Story = { args: { addresses: [], value: { fulfillment: "PICKUP", addressId: null, paymentMethod: null, wayId: null } } }

/** A loja tem faixas de entrega: o frete e a janela aparecem sob o endereço (BEELINK-178). */
export const FreteCotado: Story = {
  args: { shipping: { delivery: true, pickup: true, ways: [{ id: "OWN", title: "Entrega da loja", detail: "R$ 5,00 · chega em 30–50 min depois de sair da loja" }], note: "R$ 5,00 · chega em 30–50 min depois de sair da loja" } },
}

/** O endereço fica fora do raio da loja: dito na hora, com a retirada ainda oferecida. */
export const ForaDoRaio: Story = {
  args: {
    shipping: {
      delivery: true,
      pickup: true,
      ways: [],
      note: "A loja não entrega neste endereço: ele fica a 10,8 km, e a entrega vai até 8 km. Escolha outro endereço ou retire na loja.",
    },
  },
}

/** A loja só entrega: a retirada não é oferecida. */
export const SoEntrega: Story = {
  args: { shipping: { delivery: true, pickup: false, ways: [{ id: "OWN", title: "Entrega da loja", detail: "Frete grátis nesta compra · chega em 40–70 min depois de sair da loja" }], note: "Frete grátis nesta compra · chega em 40–70 min depois de sair da loja" } },
}

/** A entrega da loja e as transportadoras do Melhor Envio dela (BEELINK-186): o cliente escolhe. */
export const ComTransportadoras: Story = {
  args: {
    value: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: "PIX", wayId: "CARRIER:2" },
    shipping: {
      delivery: true,
      pickup: true,
      note: null,
      ways: [
        { id: "OWN", title: "Entrega da loja", detail: "R$ 9,00 · chega em 40–70 min depois de sair da loja" },
        { id: "CARRIER:1", title: "Correios · PAC", detail: "R$ 18,20 · chega em 7–9 dias úteis" },
        { id: "CARRIER:2", title: "Correios · SEDEX", detail: "R$ 27,45 · chega em 3–4 dias úteis" },
      ],
    },
  },
}
