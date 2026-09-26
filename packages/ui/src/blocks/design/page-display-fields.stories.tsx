// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { PageDisplayFields } from "./page-display-fields"

const meta = {
  title: "Blocks/Design/PageDisplayFields",
  component: PageDisplayFields,
  decorators: [(Story) => <div className="w-96 p-4"><Story /></div>],
  args: { id: "display", value: { inMenu: false, usesChrome: true }, onChange: fn() },
} satisfies Meta<typeof PageDisplayFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}
export const NoMenuSemTopo: Story = { args: { value: { inMenu: true, usesChrome: false } } }
