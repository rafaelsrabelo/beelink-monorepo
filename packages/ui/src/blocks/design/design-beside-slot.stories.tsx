// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { StorefrontBandCell } from "../storefront/storefront-band-cell"
import { StorefrontBandGrid } from "../storefront/storefront-band-grid"
import { DesignBesideSlot } from "./design-beside-slot"

const meta = {
  title: "Blocos/Modo design/Espaço ao lado",
  component: DesignBesideSlot,
  parameters: { layout: "padded" },
  args: { name: "Banner de verão", onAdd: fn() },
} satisfies Meta<typeof DesignBesideSlot>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Um banner em um terço, e o espaço ao lado dele na mesma linha: do tamanho do bloco que entraria ali.
 * Só no modo design; a loja nunca desenha.
 */
export const AoLadoDeUmTerco: Story = {
  render: (args) => (
    <StorefrontBandGrid>
      <StorefrontBandCell span="THIRD">
        <div className="bg-muted h-40 rounded-2xl" />
      </StorefrontBandCell>
      <StorefrontBandCell span="THIRD">
        <DesignBesideSlot {...args} />
      </StorefrontBandCell>
    </StorefrontBandGrid>
  ),
}
