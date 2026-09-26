// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BandArrangement, type ArrangementBand } from "./band-arrangement"

/** The real shop the editor was measured on: every band holds one block. */
const single: ArrangementBand[] = [
  {
    id: "b1",
    name: "Destaque",
    background: null,
    width: "FULL",
    isActive: true,
    components: [
      {
        id: "c1",
        kind: "BANNER",
        title: "Capa de inverno",
        imageUrl: "https://picsum.photos/seed/single-cover/240/120",
        span: "FULL",
        isActive: true,
      },
    ],
  },
  {
    id: "b2",
    background: "oklch(0.93 0.05 150)",
    width: "CONTAINED",
    isActive: true,
    components: [{ id: "c2", kind: "PRODUCTS", title: null, span: "FULL", isActive: true, deletable: false }],
  },
  {
    id: "b3",
    background: null,
    width: "CONTAINED",
    isActive: false,
    components: [{ id: "c3", kind: "BENEFITS", title: null, span: "FULL", isActive: true, empty: true }],
  },
]

const meta = {
  title: "Blocos/Modo design/Cartão de bloco único",
  component: BandArrangement,
  parameters: { layout: "padded" },
  args: {
    bands: single,
    onReorder: () => {},
    onReorderComponents: () => {},
    onToggleBand: () => {},
    onEditBand: () => {},
    onDeleteBand: () => {},
    onToggle: () => {},
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
 * Três faixas de um bloco, três cartões: a alça move a faixa, a bolinha abre a folha dela, e o nome
 * abre o bloco. A última vitrine não tem lixeira; a faixa escondida aparece esmaecida.
 */
export const TresCartoes: Story = {}

/** A mesma faixa com um segundo bloco: o cartão vira o contêiner com os dois. */
export const ViraConteiner: Story = {
  args: {
    bands: [
      {
        ...single[0]!,
        components: [
          ...single[0]!.components,
          { id: "c4", kind: "HEADING", title: "Novidades", span: "HALF", isActive: true },
        ],
      },
    ],
  },
}
