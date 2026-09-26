// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { DesignPublishDialog } from "./design-publish-dialog"

const meta = {
  title: "Blocks/Design/DesignPublishDialog",
  component: DesignPublishDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    pageName: "Página inicial",
    problems: [],
    note: "",
    onNoteChange: fn(),
    onPublish: fn(),
    publishing: false,
  },
} satisfies Meta<typeof DesignPublishDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Conferindo: Story = { args: { problems: null } }
export const SemProblemas: Story = {}
export const ComProblemas: Story = {
  args: {
    problems: [
      { kind: "LINK_TO_MISSING_PRODUCT", blockName: "Banner", bandName: "Faixa 1" },
      { kind: "SHOWCASE_EMPTY", blockName: "Mais vendidos", bandName: "Faixa 3" },
      { kind: "BANNER_WITHOUT_IMAGE", blockName: "Banner", bandName: "Faixa 5" },
    ],
  },
}
export const ConferenciaFalhou: Story = { args: { problems: null, checkFailed: true, onRetryCheck: fn() } }
export const Publicando: Story = { args: { publishing: true, note: "Preços da Black Friday" } }
