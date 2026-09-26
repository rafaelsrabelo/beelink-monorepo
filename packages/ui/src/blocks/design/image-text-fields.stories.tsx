// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ImageTextFields, type ImageTextValue } from "./image-text-fields"

const meta = {
  title: "Blocos/Modo design/Imagem e texto",
  component: ImageTextFields,
  parameters: { layout: "padded" },
  args: {
    value: {
      imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900",
      imageAlt: "Uma bolsa de couro caramelo",
      target: "CATEGORY",
      categoryId: "c1",
      productId: "",
      externalUrl: "",
      buttonLabel: "Ver a coleção",
    },
    onChange: () => {},
    categories: [{ id: "c1", name: "Bolsas" }],
    products: [],
  },
  render: function Render(args) {
    const [value, setValue] = useState<ImageTextValue>(args.value)
    return <ImageTextFields {...args} value={value} onChange={(next) => setValue((was) => ({ ...was, ...next }))} />
  },
} satisfies Meta<typeof ImageTextFields>

export default meta
type Story = StoryObj<typeof meta>

/** A imagem, o que ela mostra e o botão ao lado do texto. */
export const Padrao: Story = {}

/** Sem imagem ainda: nada a descrever. */
export const SemImagem: Story = {
  args: { value: { imageUrl: "", imageAlt: "", target: "NONE", categoryId: "", productId: "", externalUrl: "", buttonLabel: "" } },
}
