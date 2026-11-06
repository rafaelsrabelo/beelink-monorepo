import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontSearchSuggestions, type StorefrontSuggestion } from "./storefront-search-suggestions"

const add = () => {}

/** Two the cart can take as they are, one with options — chosen on its page, so no "+". */
const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Ninho com Nutella", href: "/loja/produtos/ninho", imageUrl: "https://picsum.photos/seed/w/80/80", price: "R$ 7,00", wasPrice: "R$ 8,00", hasOptions: false, onAdd: add },
  { id: "2", label: "Coco", href: "/loja/produtos/coco", imageUrl: "https://picsum.photos/seed/i/80/80", price: "R$ 6,00", hasOptions: false, onAdd: add },
  { id: "3", label: "Dindin gourmet", href: "/loja/produtos/gourmet", imageUrl: null, price: "R$ 8,00", hasOptions: true, onAdd: add },
]

const meta = {
  title: "Blocos/Vitrine/Sugestões da busca",
  component: StorefrontSearchSuggestions,
  parameters: { layout: "fullscreen" },
  args: { listId: "sugestoes", cellId: (row: number, column: 0 | 1) => `sugestoes-${row}-${column}`, suggestions, activeRow: -1, activeColumn: 0 },
  decorators: [
    (Story) => (
      // A lista é posicionada sob o campo: aqui, sob uma caixa da altura dele.
      <div
        className="p-6"
        style={{ "--shop-background": "oklch(1 0 0)", "--shop-text": "oklch(0.15 0 0)", "--shop-primary-ink": "oklch(0.45 0.2 25)" } as CSSProperties}
      >
        <div className="relative h-12 max-w-[45rem]">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontSearchSuggestions>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** A linha em que as setas do teclado estão. */
export const ComLinhaAtiva: Story = { args: { activeRow: 1 } }

/** A seta para a direita leva ao "+" do produto. */
export const NoMaisDaLinha: Story = { args: { activeRow: 0, activeColumn: 1 } }

/** A lista mostra só os primeiros: a última linha leva a todos. */
export const ComVerTodos: Story = { args: { total: 18, seeAllHref: "/loja/busca?q=whey" } }

/** Enquanto a resposta não chega. */
export const Buscando: Story = { args: { suggestions: [], pending: true } }
