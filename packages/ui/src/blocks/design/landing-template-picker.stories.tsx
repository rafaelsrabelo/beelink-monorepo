// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { LandingTemplatePicker } from "./landing-template-picker"
import { SHOP_LANDINGS, SITE_LANDINGS } from "./landing-template.fixtures"

const meta = {
  title: "Blocks/Design/LandingTemplatePicker",
  component: LandingTemplatePicker,
  decorators: [(Story) => <div className="w-[36rem] p-4"><Story /></div>],
  args: { value: "lancamento", onChange: fn(), templates: SHOP_LANDINGS },
} satisfies Meta<typeof LandingTemplatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Loja: Story = {}

/** Um site: o catálogo só oferece o Em branco. */
export const Site: Story = { args: { value: "em-branco", templates: SITE_LANDINGS } }

/** A categoria da loja indica um modelo, que vem primeiro. */
export const ComIndicado: Story = {
  args: { value: "colecao", templates: [{ id: "colecao", needsProduct: true, recommended: true }, ...SHOP_LANDINGS.filter((option) => option.id !== "colecao")] },
}

/** A lista ainda não chegou. */
export const Carregando: Story = { args: { value: null, templates: [], state: "loading" } }

/** A lista não pôde ser lida. */
export const Falha: Story = { args: { value: null, templates: [], state: "failed", onRetry: fn() } }
