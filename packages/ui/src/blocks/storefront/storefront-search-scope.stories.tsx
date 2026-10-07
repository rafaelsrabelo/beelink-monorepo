// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets, sampleDarkShopColors } from "../store/store.fixtures"
import { StorefrontSearchScopeSelect } from "./storefront-search-scope"

const scopes = [
  { value: "whey", label: "Whey" },
  { value: "termogenicos", label: "Termogênicos e Controles de peso" },
  { value: "longa", label: "Suplementos para academia, treino funcional e corrida de rua!" },
]

const meta = {
  title: "Blocos/Vitrine/Busca/Buscar em",
  component: StorefrontSearchScopeSelect,
  args: { scopes },
  // Inside a bar of the search's own height, in a shop's colours: the button fills the bar's height.
  decorators: [
    (Story, { parameters }) => (
      <form style={shopPaletteVariables(parameters.dark ? sampleDarkShopColors : sampleColorPresets[2]!.colors)} className="flex h-10 w-[22rem] overflow-hidden rounded-[10px] bg-shop-background">
        {Story()}
        <span className="flex flex-1 items-center px-3 text-sm text-shop-placeholder">O que você procura?</span>
      </form>
    ),
  ],
} satisfies Meta<typeof StorefrontSearchScopeSelect>

export default meta
type Story = StoryObj<typeof meta>

/** A loja toda: "Todos" ocupa só o que a palavra pede, mesmo com categorias de nome comprido na lista. */
export const Todos: Story = {}

/** Uma categoria curta escolhida. */
export const CategoriaCurta: Story = { args: { value: "whey" } }

/** Uma categoria de 60 caracteres escolhida: cortada com reticências no teto de 7rem; inteira no `title` e na lista. */
export const CategoriaLonga: Story = { args: { value: "longa" } }

/** Numa loja de página escura. */
export const LojaEscura: Story = { args: { value: "termogenicos" }, parameters: { dark: true } }
