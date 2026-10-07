import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontSearchSuggestions, type StorefrontSuggestion } from "./storefront-search-suggestions"

const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Whey Protein Concentrado 900g", href: "/loja/produtos/whey", imageUrl: "https://picsum.photos/seed/w/80/80", price: "R$ 139,90" },
  { id: "2", label: "Whey Protein Isolado 900g", href: "/loja/produtos/iso", imageUrl: "https://picsum.photos/seed/i/80/80", price: "R$ 189,90" },
  { id: "3", label: "Creatina Monohidratada 300g", href: "/loja/produtos/crea", imageUrl: null, price: "R$ 89,90" },
]

const meta = {
  title: "Blocos/Vitrine/Sugestões da busca",
  component: StorefrontSearchSuggestions,
  parameters: { layout: "fullscreen" },
  args: { listId: "sugestoes", optionId: (index: number) => `sugestoes-${index}`, suggestions, active: -1 },
  decorators: [
    (Story) => (
      // A lista é posicionada sob o campo: aqui, sob uma caixa da altura dele.
      <div
        className="p-6"
        style={{ "--shop-background": "oklch(1 0 0)", "--shop-text": "oklch(0.15 0 0)", "--shop-primary-ink": "oklch(0.45 0.2 25)" } as CSSProperties}
      >
        <div className="relative h-10 max-w-[22rem]">
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
export const ComLinhaAtiva: Story = { args: { active: 1 } }

/** A lista mostra só os primeiros: a última linha leva a todos. */
export const ComVerTodos: Story = { args: { total: 18, seeAllHref: "/loja/busca?q=whey" } }

/** Enquanto a resposta não chega. */
export const Buscando: Story = { args: { suggestions: [], pending: true } }
