// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { BandArrangement, type ArrangementBand } from "./band-arrangement"
import { DesignEditorBar } from "./design-editor-bar"
import { DesignEditorFrame } from "./design-editor-frame"

const bands: ArrangementBand[] = [
  {
    id: "band-1",
    background: null,
    isActive: true,
    components: [{ id: "1", kind: "ANNOUNCEMENT", title: "Frete grátis acima de R$ 199", span: "FULL", isActive: true }],
  },
  {
    id: "band-2",
    background: null,
    isActive: true,
    components: [{ id: "2", kind: "PRODUCTS", title: "Mais vendidos", span: "FULL", isActive: true, deletable: false }],
  },
]

const meta = {
  title: "Blocks/Design/DesignEditorFrame",
  component: DesignEditorFrame,
  parameters: { layout: "fullscreen" },
  args: {
    bar: (
      <DesignEditorBar
        backHref="#"
        shopName="Mutante Performance"
        pageName="Página inicial"
        device="DESKTOP"
        onDeviceChange={fn()}
        changes={2}
        publishing={false}
        onPublish={fn()}
        onDiscard={fn()}
        shopHref="#"
        onOpenStructure={fn()}
        onOpenInspector={fn()}
      />
    ),
    structure: (
      <BandArrangement
        bands={bands}
        onReorder={fn()}
        onReorderComponents={fn()}
        onToggleBand={fn()}
        onEditBand={fn()}
        onDeleteBand={fn()}
        onToggle={fn()}
        onSpanChange={fn()}
        onDelete={fn()}
        onEdit={fn()}
        onInsert={fn()}
      />
    ),
    preview: <div className="bg-background h-[640px] w-full rounded-xl border" />,
    inspector: <p className="text-muted-foreground text-sm">Escolha um bloco na prévia ou na estrutura.</p>,
    structureOpen: false,
    onStructureOpenChange: fn(),
    inspectorOpen: false,
    onInspectorOpenChange: fn(),
  },
} satisfies Meta<typeof DesignEditorFrame>

export default meta
type Story = StoryObj<typeof meta>

export const TresColunas: Story = {}
