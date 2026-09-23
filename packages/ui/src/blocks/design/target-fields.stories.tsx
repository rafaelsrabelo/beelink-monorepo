// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { TargetFields } from "./target-fields"

const meta = {
  title: "Blocos/Modo design/Destino",
  component: TargetFields,
  parameters: { layout: "padded" },
  args: {
    idPrefix: "demo",
    value: { target: "CATEGORY", categoryId: "cat-1", productId: "", externalUrl: "" },
    onChange: () => {},
    categories: [
      { id: "cat-1", name: "Blusas" },
      { id: "cat-2", name: "Calças" },
    ],
    products: [{ id: "prod-1", name: "Whey 900g" }],
  },
  decorators: [
    (Story) => (
      <div className="flex max-w-md flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TargetFields>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Para onde uma coisa leva: categoria, produto, um endereço fora da loja, ou nada. O mesmo bloco
 * responde pelo slide do banner e pela barra de aviso — um destino respondido de dois jeitos é um
 * destino que diverge. Guarda o id, nunca o endereço.
 */
export const Categoria: Story = {}

/** Fora da loja: só aqui se pede um endereço. */
export const Externo: Story = {
  args: { value: { target: "EXTERNAL", categoryId: "", productId: "", externalUrl: "https://wa.me/5511999999999" } },
}
