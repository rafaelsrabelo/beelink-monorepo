// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { EMPTY_BANNER } from "./banner-form-types"
import type { BannerFormValues } from "./banner-form-types"
import { BannerTargetFields } from "./banner-target-fields"

const meta = {
  title: "Blocos/Banners/Destino",
  component: BannerTargetFields,
  parameters: { layout: "padded" },
  args: {
    value: EMPTY_BANNER,
    onChange: () => {},
    categories: [{ slug: "blusas", name: "Blusas" }],
    products: [{ slug: "whey", name: "Whey 900g" }],
  },
  // Live: the whole block is the field following the target, and a static story shows one of three.
  render: function Live(args) {
    const [value, setValue] = useState<BannerFormValues>(args.value)

    return (
      <div className="flex max-w-md flex-col gap-4">
        <BannerTargetFields {...args} value={value} onChange={setValue} />
      </div>
    )
  },
} satisfies Meta<typeof BannerTargetFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** O único destino que guarda texto, porque não há nada no banco para apontar. */
export const ParaForaDaLoja: Story = {
  args: { value: { ...EMPTY_BANNER, target: "EXTERNAL", externalUrl: "https://wa.me/5585999998888" } },
}

export const EmIngles: Story = { args: { messages: en } }
