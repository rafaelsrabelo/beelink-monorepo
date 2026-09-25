// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { combinationsOf } from "@harness-monorepo/ui/lib/variations"

// Block
import { BASE_ROW, BLOUSE } from "./variation-fixtures"
import { VariationTableHeader } from "./variation-table-header"

const meta = {
  title: "Blocos/Catálogo/Variações/Cabeçalho das combinações",
  component: VariationTableHeader,
  parameters: { layout: "padded" },
  args: {
    combinations: combinationsOf(BLOUSE, BASE_ROW),
    selection: { "P|areia": true, "P|preto": true, "P|terracota": true },
    onSelection: () => {},
    onBulk: () => {},
    trackStock: true,
  },
} satisfies Meta<typeof VariationTableHeader>

export default meta
type Story = StoryObj<typeof meta>

/** Todas as de P escolhidas por um clique em "P", prontas para o mesmo preço. */
export const Padrao: Story = {}
