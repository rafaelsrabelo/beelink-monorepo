// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { AdminSearch } from "./admin-search"

const meta = {
  title: "Blocos/Admin/Busca",
  component: AdminSearch,
  decorators: [
    (Story) => (
      <div className="bg-header w-full max-w-xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminSearch>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** With a term in it. The field is controlled by the screen, which owns what a search means. */
export const ComTermo: Story = { args: { value: "blusa" } }

export const EmIngles: Story = { args: { messages: en } }
