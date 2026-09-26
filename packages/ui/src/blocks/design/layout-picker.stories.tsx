// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// UI
import { Button } from "../../components/button"

// Block
import { COMPONENT_DISPLAYS } from "./design-types"
import { LayoutPicker } from "./layout-picker"
import { LayoutThumbnail } from "./layout-thumbnail"

const meta = {
  title: "Blocos/Modo design/Trocar layout",
  component: LayoutPicker,
  parameters: { layout: "centered" },
  args: {
    layouts: ["BACKDROP", "SPLIT", "CAROUSEL", "GRID"],
    value: "CAROUSEL",
    onChange: fn(),
    label: "Trocar layout de Banner",
    trigger: <Button variant="outline">Trocar layout</Button>,
  },
} satisfies Meta<typeof LayoutPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Os quatro layouts de um banner, com o carrossel em uso. */
export const Banner: Story = {}

/** Vantagens: em linha ou em cartões. */
export const Vantagens: Story = { args: { layouts: ["INLINE", "CARDS"], value: "INLINE", label: "Trocar layout de Vantagens" } }

/** Todas as miniaturas, lado a lado. */
export const Miniaturas: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-3">
      {COMPONENT_DISPLAYS.map((display) => (
        <div key={display} className="flex flex-col items-center gap-1 text-xs">
          <LayoutThumbnail display={display} />
          {display}
        </div>
      ))}
    </div>
  ),
}
