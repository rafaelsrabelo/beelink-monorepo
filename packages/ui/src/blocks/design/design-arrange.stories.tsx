// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ArrangeBoard, ArrangeScale, useArrangeItem } from "./design-arrange"

function Row({ id, label }: { id: string; label: string }) {
  const drag = useArrangeItem(id)

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className="bg-muted flex items-center gap-2 rounded-lg p-3 text-sm"
    >
      <button type="button" aria-label={`Arrastar: ${label}`} className="cursor-grab touch-none" {...drag.handleProps}>
        ⠿
      </button>
      {label}
    </li>
  )
}

const meta = {
  title: "Blocos/Modo design/Tabuleiro",
  component: ArrangeBoard,
  parameters: { layout: "padded" },
  args: {
    ids: ["a", "b", "c"],
    onReorder: () => {},
    children: (
      <ul className="flex max-w-sm flex-col gap-2">
        <Row id="a" label="Primeiro" />
        <Row id="b" label="Segundo" />
        <Row id="c" label="Terceiro" />
      </ul>
    ),
  },
} satisfies Meta<typeof ArrangeBoard>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Uma coluna: o movimento fica preso no eixo vertical e dentro do painel, porque uma linha
 * arrastada para o lado é uma linha indo a lugar nenhum.
 *
 * Funciona pelo teclado também: Tab até a alça, Espaço para pegar, setas, Espaço para soltar.
 */
export const Lista: Story = {}

/**
 * Uma grade — a loja de verdade, onde dois cartazes ficam lado a lado. Prender num eixo só
 * tornaria o da direita inalcançável.
 */
export const Grade: Story = { args: { layout: "grid" } }

/**
 * Dentro de uma superfície reduzida.
 *
 * `ArrangeScale` existe porque o dnd-kit move o elemento com um `translate` **dentro da caixa
 * dele**, e uma caixa sob `scale(0.5)` pinta cada um desses pixels pela metade — o ponteiro não é
 * escalado. Sem a divisão, o bloco anda na metade da velocidade do dedo e nunca chega onde está
 * sendo posto.
 */
export const DentroDeUmaSuperficieReduzida: Story = {
  decorators: [
    (Story) => (
      <ArrangeScale scale={0.5}>
        <div style={{ width: 800, transform: "scale(0.5)", transformOrigin: "top left" }}>
          <Story />
        </div>
      </ArrangeScale>
    ),
  ],
}
