// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { AnnouncementFields } from "./announcement-fields"

const meta = {
  title: "Blocos/Modo design/Campos da barra de aviso",
  component: AnnouncementFields,
  parameters: { layout: "padded" },
  args: {
    value: { background: presets[2]!.colors.primary, target: "CATEGORY", categoryId: "cat-1", productId: "", externalUrl: "" },
    onChange: () => {},
    pageBackground: presets[0]!.colors.background,
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
 * A cor da barra — que é a cor da faixa dela — e para onde ela leva, com o mesmo bloco de destino
 * do slide do banner. Na loja, a barra inteira vira um link.
 */
export const Padrao: Story = {}
