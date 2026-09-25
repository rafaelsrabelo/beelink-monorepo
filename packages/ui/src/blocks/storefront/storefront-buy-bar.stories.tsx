// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontBuyBar } from "./storefront-buy-bar"
import { StorefrontPrice } from "./storefront-price"

const meta = {
  title: "Blocos/Vitrine/Barra de compra do celular",
  component: StorefrontBuyBar,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), minHeight: 320 }}>{Story()}</div>],
  args: {
    shown: true,
    price: <StorefrontPrice priceCents={11990} compareAtPriceCents={14990} locale="pt-BR" size="compact" />,
    label: "Adicionar ao carrinho",
    onAct: () => {},
    cartHref: "#",
  },
} satisfies Meta<typeof StorefrontBuyBar>

export default meta
type Story = StoryObj<typeof meta>

/** Fixa embaixo enquanto os botões da caixa ainda não apareceram. */
export const Padrao: Story = {}

export const Adicionado: Story = { args: { added: true } }

export const AviseMe: Story = { args: { label: "Avise-me quando chegar" } }
