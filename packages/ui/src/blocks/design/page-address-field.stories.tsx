// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { PageAddressField } from "./page-address-field"

const meta = {
  title: "Blocks/Design/PageAddressField",
  component: PageAddressField,
  decorators: [(Story) => <div className="w-96 p-4"><Story /></div>],
  args: { id: "address", prefix: "/mutante/lp/", value: "lancamento-whey", onChange: fn(), state: "available" },
} satisfies Meta<typeof PageAddressField>

export default meta
type Story = StoryObj<typeof meta>

export const Disponivel: Story = {}
export const Verificando: Story = { args: { state: "checking" } }
export const JaExiste: Story = { args: { state: "taken" } }
export const Invalido: Story = { args: { value: "!", state: "invalid" } }
