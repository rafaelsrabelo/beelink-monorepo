// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { InsertPoint } from "./insert-point"

const meta = {
  title: "Blocos/Modo design/Inserir aqui",
  component: InsertPoint,
  parameters: { layout: "padded" },
  args: { label: "Nova faixa na posição 2", onInsert: () => {} },
  decorators: [
    (Story) => (
      <ul className="flex w-80 flex-col">
        <li className="bg-muted rounded-lg p-4 text-sm">Faixa 1</li>
        <Story />
        <li className="bg-muted rounded-lg p-4 text-sm">Faixa 2</li>
      </ul>
    ),
  ],
} satisfies Meta<typeof InsertPoint>

export default meta
type Story = StoryObj<typeof meta>

/** Passe o mouse entre as faixas, ou chegue com Tab: o "+" aparece onde o bloco vai entrar. */
export const Padrao: Story = {}
