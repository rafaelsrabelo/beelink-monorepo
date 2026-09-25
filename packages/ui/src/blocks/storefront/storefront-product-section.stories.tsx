import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontProductSection } from "./storefront-product-section"
import { StorefrontRichText } from "./storefront-rich-text"

const meta = {
  title: "Blocos/Vitrine/Produto · seção inferior",
  component: StorefrontProductSection,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    id: "descricao",
    title: "Descrição do produto",
    children: <StorefrontRichText markdown={"- **Mais energia** para treinos intensos.\n- **Foco total** no treino.\n\nUm pré-treino para quem treina pesado."} className="text-[15px] leading-[1.6]" />,
  },
} satisfies Meta<typeof StorefrontProductSection>

export default meta
type Story = StoryObj<typeof meta>

/** O quadro das seções abaixo das três colunas: um fio, 28px acima e abaixo, título de 22px. */
export const Descricao: Story = {}
