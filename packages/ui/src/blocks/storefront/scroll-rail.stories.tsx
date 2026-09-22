// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ScrollRail } from "./scroll-rail"

const meta = {
  title: "Blocos/Vitrine/Trilho com setas",
  component: ScrollRail,
  parameters: { layout: "padded" },
  args: { label: "Destaques", previousLabel: "Anterior", nextLabel: "Próximos" },
  decorators: [
    (Story) => (
      <div className="max-w-2xl px-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScrollRail>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Rolagem nativa com as setas por cima — e não o carousel do shadcn, que é Embla e esconde o
 * overflow. O porquê está no comentário do bloco e em docs/ai-rules/styling.md.
 */
export const Padrao: Story = {
  args: {
    children: (
      <ul className="flex gap-3 px-4">
        {Array.from({ length: 10 }, (_unused, at) => (
          <li
            key={at}
            className="bg-muted flex size-40 shrink-0 snap-start items-center justify-center rounded-xl text-2xl font-semibold"
          >
            {at + 1}
          </li>
        ))}
      </ul>
    ),
  },
}
