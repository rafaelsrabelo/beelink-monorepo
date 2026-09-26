// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ButtonFields, type ButtonValue } from "./button-fields"

const meta = {
  title: "Blocos/Modo design/Botão",
  component: ButtonFields,
  parameters: { layout: "padded" },
  args: {
    value: { target: "PRODUCT", categoryId: "", productId: "p1", externalUrl: "", buttonLabel: "Comprar agora" },
    onChange: () => {},
    categories: [{ id: "c1", name: "Blusas" }],
    products: [{ id: "p1", name: "Whey Baunilha" }],
  },
  render: function Render(args) {
    const [value, setValue] = useState<ButtonValue>(args.value)
    return <ButtonFields {...args} value={value} onChange={(next) => setValue((was) => ({ ...was, ...next }))} />
  },
} satisfies Meta<typeof ButtonFields>

export default meta
type Story = StoryObj<typeof meta>

/** Para onde leva e o que diz. */
export const Padrao: Story = {}

/** "Nenhum": sem botão, então nada a escrever. */
export const SemBotao: Story = { args: { value: { target: "NONE", categoryId: "", productId: "", externalUrl: "", buttonLabel: "" } } }

/** Leva a algum lugar e ainda não diz nada: o Salvar espera. */
export const SemTexto: Story = { args: { value: { target: "PRODUCT", categoryId: "", productId: "p1", externalUrl: "", buttonLabel: "" } } }
