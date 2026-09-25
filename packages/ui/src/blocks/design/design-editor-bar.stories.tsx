// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { DesignEditorBar } from "./design-editor-bar"

const meta = {
  title: "Blocks/Design/DesignEditorBar",
  component: DesignEditorBar,
  parameters: { layout: "fullscreen" },
  args: {
    backHref: "#",
    shopName: "Mutante Performance",
    pageName: "Página inicial",
    device: "PHONE",
    onDeviceChange: fn(),
    changes: 0,
    publishing: false,
    onPublish: fn(),
    onDiscard: fn(),
    shopHref: "#",
    onOpenStructure: fn(),
    onOpenInspector: fn(),
  },
} satisfies Meta<typeof DesignEditorBar>

export default meta
type Story = StoryObj<typeof meta>

export const Publicado: Story = {}

export const Rascunho: Story = { args: { changes: 3 } }

export const Publicando: Story = { args: { changes: 3, publishing: true } }
