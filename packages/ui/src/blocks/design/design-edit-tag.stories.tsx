// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { DesignEditTag } from "./design-edit-tag"

const meta = {
  title: "Blocos/Modo design/Editar no preview",
  component: DesignEditTag,
  parameters: { layout: "padded" },
  args: {
    label: "Novidades da semana",
    onEdit: () => {},
    children: (
      <div className="bg-muted flex h-40 items-center justify-center rounded-xl">
        <p className="text-lg font-semibold">Novidades da semana</p>
      </div>
    ),
  },
} satisfies Meta<typeof DesignEditTag>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Passe o mouse sobre o bloco: o lápis aparece no canto. Ele abre os campos do componente; não é
 * a alça de arrastar — arrastar no preview move a faixa inteira, e os dois gestos ficam separados
 * de propósito.
 */
export const Padrao: Story = {}
