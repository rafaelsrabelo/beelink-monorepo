// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { DesignVersionList } from "./design-version-list"

const versions = [
  { id: "v3", number: 3, when: "26/09/2026 14:30", author: "Ana", note: "Preços da Black Friday", live: true },
  { id: "v2", number: 2, when: "20/09/2026 09:12", author: "Ana", note: null, live: false },
  { id: "v1", number: 1, when: "10/09/2026 18:00", author: null, note: null, live: false },
]

const meta = {
  title: "Blocks/Design/DesignVersionList",
  component: DesignVersionList,
  decorators: [(Story) => <div className="w-80 p-4"><Story /></div>],
  args: { versions, onRestore: fn(), restoring: false },
} satisfies Meta<typeof DesignVersionList>

export default meta
type Story = StoryObj<typeof meta>

export const Lista: Story = {}
export const Carregando: Story = { args: { versions: null } }
export const Vazia: Story = { args: { versions: [] } }
export const Restaurando: Story = { args: { restoring: true } }
