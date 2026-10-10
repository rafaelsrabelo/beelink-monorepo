// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontInstallments } from "./storefront-installments"

const meta = {
  title: "Blocos/Vitrine/Parcelas",
  component: StorefrontInstallments,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { priceCents: 8990, terms: { maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }, locale: "pt-BR" },
} satisfies Meta<typeof StorefrontInstallments>

export default meta
type Story = StoryObj<typeof meta>

/** Sob o preço de um card: até onde a loja parcela, sem juros. */
export const NoCard: Story = {}

/** Na página do produto, um pouco maior. */
export const NoProduto: Story = { args: { size: "product" } }

/** Um preço baixo divide em menos vezes: nenhuma parcela fica abaixo do mínimo. */
export const PrecoBaixo: Story = { args: { priceCents: 1690 } }

/** Só à vista: a linha não é desenhada. */
export const SoAVista: Story = { args: { priceCents: 990 } }
