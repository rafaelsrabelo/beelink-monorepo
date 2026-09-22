// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ArrangeBoard } from "./design-arrange"
import { DesignHandle } from "./design-handle"

const meta = {
  title: "Blocos/Modo design/Alça sobre o bloco",
  component: DesignHandle,
  parameters: { layout: "padded" },
  args: { id: "1", label: "Coleção de inverno" },
  decorators: [
    (Story) => (
      // A alça só funciona dentro de um tabuleiro: é ele que sabe a ordem e recebe o resultado.
      <ArrangeBoard ids={["1", "2"]} onReorder={() => {}} layout="grid">
        <div className="max-w-md">
          <Story />
        </div>
      </ArrangeBoard>
    ),
  ],
} satisfies Meta<typeof DesignHandle>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A alça aparece no hover e no foco — desenhada o tempo todo sobre cada cartaz, ela vira exatamente
 * o enfeite que o lojista está tentando enxergar por baixo.
 */
export const Padrao: Story = {
  args: {
    children: (
      <div className="bg-muted flex h-40 items-end rounded-2xl p-5">
        <p className="text-lg font-semibold">Coleção de inverno</p>
      </div>
    ),
  },
}
