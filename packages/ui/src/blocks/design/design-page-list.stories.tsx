// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { samplePageRows } from "./design-page.fixtures"
import { DesignPageList } from "./design-page-list"

const meta = {
  title: "Blocks/Design/DesignPageList",
  component: DesignPageList,
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    pages: samplePageRows,
    currentId: "lp-1",
    onStatus: fn(),
    onSettings: fn(),
    onCreate: fn(),
  },
} satisfies Meta<typeof DesignPageList>

export default meta
type Story = StoryObj<typeof meta>

/** A inicial, uma landing no ar e no menu, um rascunho e uma arquivada, dobrada. */
export const Completa: Story = {}

/** Só a inicial: o convite para a primeira landing. */
export const SoAInicial: Story = {
  args: { pages: samplePageRows.slice(0, 1), currentId: "home" },
}

export const Carregando: Story = {
  args: { pages: null },
}

export const Recusada: Story = {
  args: { error: "Não foi possível mudar a página. Tente de novo." },
}
