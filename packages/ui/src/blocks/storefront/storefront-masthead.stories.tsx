// React
import type { CSSProperties } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontMasthead } from "./storefront-masthead"

const meta = {
  title: "Blocos/Vitrine/Topo",
  component: StorefrontMasthead,
  parameters: { layout: "fullscreen" },
  args: { name: "Asfalto Norte", homeHref: "/asfalto-norte" },
  decorators: [
    (Story) => (
      <div
        style={
          {
            "--shop-header": "oklch(0.3 0.06 250)",
            "--shop-on-header": "oklch(0.98 0 0)",
            "--shop-primary": "oklch(0.8 0.15 80)",
            "--shop-on-primary": "oklch(0.2 0 0)",
          } as CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontMasthead>

export default meta
type Story = StoryObj<typeof meta>

/** Um site: as faixas com nome viram o menu, e a faixa de contato vira o botão. */
export const Site: Story = {
  args: {
    menu: [
      { id: "s", label: "Serviços", href: "#servicos" },
      { id: "c", label: "Como funciona", href: "#como-funciona" },
    ],
    cta: { label: "Pedir orçamento", href: "#contato" },
  },
}

/** Uma loja: busca no meio, conta e carrinho à direita. */
export const Loja: Story = {
  args: { name: "Lessari Crochê", homeHref: "/lessari", searchAction: "/lessari/busca", cartHref: "/lessari/carrinho", accountHref: "/login" },
}
