// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { PageSeoFields } from "./page-seo-fields"

const meta = {
  title: "Blocks/Design/PageSeoFields",
  component: PageSeoFields,
  decorators: [(Story) => <div className="w-96 p-4"><Story /></div>],
  args: { id: "seo", value: { title: "", description: "", imageUrl: "" }, onChange: fn() },
} satisfies Meta<typeof PageSeoFields>

export default meta
type Story = StoryObj<typeof meta>

export const EmBranco: Story = {}
export const Preenchido: Story = {
  args: {
    value: {
      title: "Whey Baunilha 900 g com 20% off",
      description: "Proteína isolada, 24 g por dose. Frete grátis acima de R$ 199.",
      imageUrl: "https://cdn.example/whey.png",
    },
  },
}
