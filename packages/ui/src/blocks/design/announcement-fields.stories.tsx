// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { AnnouncementFields } from "./announcement-fields"

const meta = {
  title: "Blocos/Modo design/Campos da barra de aviso",
  component: AnnouncementFields,
  parameters: { layout: "padded" },
  args: {
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
} satisfies Meta<typeof AnnouncementFields>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Para onde a barra leva, com o mesmo bloco de destino do slide do banner. Na loja, a barra inteira
 * vira um link. A cor dela é a da faixa, no Estilo.
 */
export const Padrao: Story = {}
