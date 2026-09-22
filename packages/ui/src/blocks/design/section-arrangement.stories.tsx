// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { SectionArrangement, type ArrangementItem } from "./section-arrangement"

const items: ArrangementItem[] = [
  {
    id: "1",
    kind: "COVER",
    title: null,
    imageUrl: "https://picsum.photos/seed/arrange-cover/240/120",
    layout: "FULL",
    isActive: true,
  },
  {
    id: "2",
    kind: "BENEFITS",
    title: null,
    imageUrl: null,
    layout: "FULL",
    isActive: true,
  },
  {
    id: "3",
    kind: "TEXT",
    title: "Novidades da semana",
    imageUrl: null,
    layout: "FULL",
    isActive: true,
  },
  {
    id: "4",
    kind: "PRODUCTS",
    title: null,
    imageUrl: null,
    layout: "FULL",
    isActive: true,
  },
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
    layout: "THIRDS",
    isActive: false,
  },
]

const meta = {
  title: "Blocos/Modo design/Arranjo da página",
  component: SectionArrangement,
  parameters: { layout: "padded" },
  args: { items, onReorder: () => {}, onToggle: () => {}, onLayoutChange: () => {} },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionArrangement>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Uma lista só, com os cinco tipos de bloco. Arrasta com o mouse e **também** com o teclado: Tab
 * até a alça, Espaço para pegar, setas para mover, Espaço de novo para soltar.
 *
 * Só o banner tem tamanho: "que largura" é pergunta sobre um cartaz, não sobre um título nem sobre
 * a lista de produtos. Um bloco sem título é chamado pelo tipo — quatro linhas dizendo "Sem
 * título" não diriam qual é qual.
 *
 * O último está oculto: a loja não desenha nada dele.
 */
export const Padrao: Story = {}

/** Antes do primeiro bloco: um convite, não uma lista vazia. */
export const Vazio: Story = { args: { items: [] } }
