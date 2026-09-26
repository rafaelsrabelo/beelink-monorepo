// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { LANDING_TEMPLATES, LandingTemplatePicker } from "./landing-template-picker"

const meta = {
  title: "Blocks/Design/LandingTemplatePicker",
  component: LandingTemplatePicker,
  decorators: [(Story) => <div className="w-[36rem] p-4"><Story /></div>],
  args: { value: "lancamento", onChange: fn(), available: LANDING_TEMPLATES },
} satisfies Meta<typeof LandingTemplatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Loja: Story = {}

/** Um site: só o Em branco pode ser escolhido. */
export const Site: Story = { args: { value: "em-branco", available: ["em-branco"] } }
