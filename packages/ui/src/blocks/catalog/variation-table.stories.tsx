// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { combinationsOf } from "@harness-monorepo/ui/lib/variations"

// Block
import { BASE_ROW, BLOUSE } from "./variation-fixtures"
import { VariationTable } from "./variation-table"

const meta = {
  title: "Blocos/Catálogo/Variações/Tabela de combinações",
  component: VariationTable,
  parameters: { layout: "padded" },
  args: {
    combinations: combinationsOf(BLOUSE, BASE_ROW),
    onRow: () => {},
    trackStock: true,
    selection: { "P|areia": true, "P|terracota": true },
    onSelection: () => {},
  },
} satisfies Meta<typeof VariationTable>

export default meta
type Story = StoryObj<typeof meta>

/** Duas linhas escolhidas para uma ação em massa, e GG · Terracota desligada. */
export const Padrao: Story = {}

export const SemEstoque: Story = { args: { trackStock: false, selection: {} } }
