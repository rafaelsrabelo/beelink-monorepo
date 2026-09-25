// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontMasthead } from "./storefront-masthead"

const meta = {
  title: "Blocos/Vitrine/Topo",
  component: StorefrontMasthead,
  parameters: { layout: "fullscreen" },
  args: { name: "Asfalto Norte", homeHref: "/asfalto-norte" },
  // The header reads the shop's variables, which the window sets; alone, it is dressed here.
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[0]!.colors)}>{Story()}</div>],
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
  args: {
    name: "Lessari Crochê",
    logoUrl: "https://picsum.photos/seed/lessari-logo/200/80",
    homeHref: "/lessari",
    deliverTo: (
      <span className="flex flex-col text-xs leading-[1.3]">
        <span className="opacity-85">Entregar em</span>
        <span className="text-sm font-bold">Informe seu CEP</span>
      </span>
    ),
    searchAction: "/lessari/busca",
    cartHref: "/lessari/carrinho",
    cartCount: 2,
    accountHref: "/lessari/conta",
  },
}

/** Sem logo, o nome em texto; sem conta ainda, só o carrinho — o que a vitrine desenha hoje. */
export const LojaSemLogo: Story = {
  args: { name: "Lessari Crochê", homeHref: "/lessari", searchAction: "/lessari/busca", cartHref: "/lessari/carrinho" },
}
