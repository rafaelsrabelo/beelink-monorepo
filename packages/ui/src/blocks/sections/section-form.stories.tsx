// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { SectionForm, EMPTY_BANNER, type SectionFormValues } from "./section-form"

const categories = [
  { slug: "blusas", name: "Blusas" },
  { slug: "vestidos", name: "Vestidos" },
]
const products = [
  { slug: "whey-concentrado-900g", name: "Whey Protein Concentrado 900g" },
  { slug: "creatina-mono-300g", name: "Creatina Monohidratada 300g" },
]

const meta = {
  title: "Blocos/Banners/Formulário",
  component: SectionForm,
  parameters: { layout: "padded" },
  args: {
    value: EMPTY_BANNER,
    onChange: () => {},
    categories,
    products,
    onSubmit: () => {},
    onCancel: () => {},
  },
  // Live: the whole point of this form is that the destination field follows the target, and a
  // static story would show one of the three and never the switch.
  render: function Live(args) {
    const [value, setValue] = useState<SectionFormValues>(args.value)

    return <SectionForm {...args} value={value} onChange={setValue} />
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const ApontandoParaProduto: Story = {
  args: { value: { ...EMPTY_BANNER, target: "PRODUCT", productSlug: "whey-concentrado-900g" } },
}

/** O único destino que guarda um texto, porque não há nada no banco para apontar. */
export const ParaForaDaLoja: Story = {
  args: {
    value: { ...EMPTY_BANNER, target: "EXTERNAL", externalUrl: "https://wa.me/5585999998888" },
  },
}

export const ComErros: Story = {
  args: {
    value: { ...EMPTY_BANNER, target: "EXTERNAL", externalUrl: "wa.me/5585" },
    errors: {
      title: { message: "Dê um título ao banner." },
      externalUrl: { message: "Comece com http:// ou https://." },
    },
  },
}

export const EmIngles: Story = { args: { messages: en } }
