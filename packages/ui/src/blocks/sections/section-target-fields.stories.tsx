// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { EMPTY_BANNER } from "./section-form-types"
import type { SectionFormValues } from "./section-form-types"
import { SectionTargetFields } from "./section-target-fields"

const meta = {
  title: "Blocos/Banners/Destino",
  component: SectionTargetFields,
  parameters: { layout: "padded" },
  args: {
    value: EMPTY_BANNER,
    onChange: () => {},
    categories: [{ slug: "blusas", name: "Blusas" }],
    products: [{ slug: "whey", name: "Whey 900g" }],
  },
  // Live: the whole block is the field following the target, and a static story shows one of three.
  render: function Live(args) {
    const [value, setValue] = useState<SectionFormValues>(args.value)

    return (
      <div className="flex max-w-md flex-col gap-4">
        <SectionTargetFields {...args} value={value} onChange={setValue} />
      </div>
    )
  },
} satisfies Meta<typeof SectionTargetFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** O único destino que guarda texto, porque não há nada no banco para apontar. */
export const ParaForaDaLoja: Story = {
  args: { value: { ...EMPTY_BANNER, target: "EXTERNAL", externalUrl: "https://wa.me/5585999998888" } },
}

/** Um pôster que fala e não leva a lugar nenhum — um aviso, uma foto, uma estação. */
export const SoInformativo: Story = { args: { value: { ...EMPTY_BANNER, target: "NONE" } } }

export const EmIngles: Story = { args: { messages: en } }
