// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontProductPurchase } from "./storefront-product-purchase"

const meta = {
  title: "Blocos/Vitrine/Produto · caixa de compra",
  component: StorefrontProductPurchase,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 320 }}>{Story()}</div>],
  args: {
    name: "Pré-Treino Haze Hardcore 300g",
    priceCents: 11990,
    compareAtPriceCents: 14990,
    locale: "pt-BR",
    showPrice: true,
    available: true,
    choosing: true,
    choiceKey: "frutas-300",
    cart: { onAdd: () => {}, href: "#" },
    onNotify: () => {},
    finishesOnWhatsApp: true,
    seller: { name: "Mutante Suplementos", paymentMethods: ["PIX", "CREDIT_CARD", "DEBIT_CARD", "MONEY"] },
  },
} satisfies Meta<typeof StorefrontProductPurchase>

export default meta
type Story = StoryObj<typeof meta>

/** A caixa de 5b, com o que existe: preço, estoque, quantidade, os dois botões, o aviso e quem vende. */
export const Padrao: Story = {}

/** Combinação esgotada: "Esgotado", a frase e "Avise-me" no lugar dos botões. */
export const Esgotado: Story = { args: { available: false } }

/** Loja sem WhatsApp: sem o aviso de onde o pedido termina. */
export const SemWhatsApp: Story = { args: { finishesOnWhatsApp: false } }

/** Loja que esconde preços. */
export const SemPreco: Story = { args: { showPrice: false } }
