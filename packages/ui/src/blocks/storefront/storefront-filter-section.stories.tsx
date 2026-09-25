import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontFilterSection } from "./storefront-filter-section"

const meta = {
  title: "Blocos/Vitrine/Seção de filtro",
  component: StorefrontFilterSection,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StorefrontFilterSection>

export default meta
type Story = StoryObj<typeof meta>

/** Um grupo da coluna de filtros: sempre aberto, título de 15px e um fio embaixo. */
export const Padrao: Story = {
  args: {
    title: "Preço",
    children: (
      <div className="flex flex-col gap-1.5 text-sm">
        <a href="#">Até R$ 50</a>
        <a href="#">R$ 50 a R$ 100</a>
      </div>
    ),
  },
}
