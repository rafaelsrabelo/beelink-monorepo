// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { samplePages } from "./design-page.fixtures"
import { DesignPageSwitcher } from "./design-page-switcher"

const meta = {
  title: "Blocks/Design/DesignPageSwitcher",
  component: DesignPageSwitcher,
  decorators: [
    (Story) => (
      <header className="bg-header flex h-12 items-center px-3 text-sm">
        <Story />
      </header>
    ),
  ],
  args: {
    pages: samplePages.filter((page) => page.status !== "ARCHIVED"),
    currentId: "lp-1",
    currentTitle: "Lançamento Whey",
    onCreate: fn(),
  },
} satisfies Meta<typeof DesignPageSwitcher>

export default meta
type Story = StoryObj<typeof meta>

/** Na barra do modo design, editando uma landing. */
export const NaLanding: Story = {}

/** Na página inicial, sem "Nova landing page" (a tela não ofereceu). */
export const NaInicial: Story = {
  args: { currentId: "home", currentTitle: "Página inicial", onCreate: undefined },
}
