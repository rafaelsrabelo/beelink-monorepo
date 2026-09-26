// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { DesignConflictDialog } from "./design-conflict-dialog"

const meta = {
  title: "Blocks/Design/DesignConflictDialog",
  component: DesignConflictDialog,
  args: { open: true, onReload: fn() },
} satisfies Meta<typeof DesignConflictDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Outra aba escreveu na página: o único caminho é recarregar. */
export const Aberto: Story = {}
