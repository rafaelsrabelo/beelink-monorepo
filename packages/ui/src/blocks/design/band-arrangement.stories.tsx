// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BandArrangement, type ArrangementBand } from "./band-arrangement"

const bands: ArrangementBand[] = [
  {
    id: "band-1",
    background: null,
    isActive: true,
    components: [
      {
        id: "1",
        kind: "BANNER",
        title: null,
        imageUrl: "https://picsum.photos/seed/arrange-cover/240/120",
        layout: "FULL",
        isActive: true,
      },
    ],
  },
  {
    id: "band-2",
    background: null,
    isActive: true,
    components: [{ id: "2", kind: "BENEFITS", title: null, layout: "FULL", isActive: true }],
  },
  {
    id: "band-3",
    background: null,
    isActive: true,
    components: [
      { id: "3", kind: "HEADING", title: "Novidades da semana", layout: "FULL", isActive: true },
      { id: "4", kind: "PRODUCTS", title: null, layout: "FULL", isActive: true },
    ],
  },
  {
    id: "band-4",
    background: null,
    isActive: true,
    components: [
      {
        id: "5",
        kind: "BANNER",
        title: "Frete grátis acima de R$ 199",
        imageUrl: "https://picsum.photos/seed/arrange-shipping/240/120",
        layout: "HALVES",
        isActive: true,
      },
      {
        id: "6",
        kind: "BANNER",
        title: "Whey 900g",
        imageUrl: "https://picsum.photos/seed/arrange-whey/240/120",
        layout: "HALVES",
        isActive: false,
      },
    ],
  },
]

const meta = {
  title: "Blocos/Modo design/Arranjo da página",
  component: BandArrangement,
  parameters: { layout: "padded" },
  args: {
    bands,
    onReorder: () => {},
    onReorderComponents: () => {},
    onToggleBand: () => {},
    onEditBand: () => {},
    onDeleteBand: () => {},
    onToggle: () => {},
    onLayoutChange: () => {},
    onDelete: () => {},
    onEdit: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BandArrangement>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Dois níveis: faixas na ordem da página, e dentro de cada uma os componentes.
 *
 * Arrasta com o mouse e **também** com o teclado: Tab até a alça, Espaço para pegar, setas para
 * mover, Espaço de novo para soltar. A faixa 3 mostra por que o nível existe — o título e a
 * prateleira andam juntos, em vez de estarem só um perto do outro.
 *
 * **Um componente não sai de uma faixa para outra ainda**, e isso é uma decisão: atravessar
 * contextos é a metade difícil de um editor de dois níveis e é a metade que deixa um editor
 * confuso. Ela vem inteira, depois.
 */
export const Padrao: Story = {}

/** Antes da primeira faixa: um convite, não uma lista vazia. */
export const Vazio: Story = { args: { bands: [] } }
