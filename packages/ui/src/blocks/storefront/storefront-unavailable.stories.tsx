import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "@harness-monorepo/ui/locales/en"
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontUnavailable } from "./storefront-unavailable"

const meta = {
  title: "Blocos/Vitrine/Loja indisponível",
  component: StorefrontUnavailable,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)} className="flex min-h-svh flex-col">{Story()}</div>],
  args: { name: "Padaria da Lia", ordersHref: "#" },
} satisfies Meta<typeof StorefrontUnavailable>

export default meta
type Story = StoryObj<typeof meta>

/** Uma loja sem logo: o nome, o aviso e o caminho para os pedidos de quem já comprou. */
export const Padrao: Story = {}

/** Com o logo da loja acima do nome. */
export const ComLogo: Story = { args: { logoUrl: "https://res.cloudinary.com/demo/image/upload/v1/samples/logo.png" } }

/** Um site, que não recebe pedidos: nenhum caminho para eles. */
export const Site: Story = { args: { name: "Estúdio Lia", ordersHref: null } }

export const EmIngles: Story = { args: { messages: en } }
