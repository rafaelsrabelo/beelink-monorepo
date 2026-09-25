import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontResultsCount } from "./storefront-results-count"

const meta = {
  title: "Blocos/Vitrine/Contagem de resultados",
  component: StorefrontResultsCount,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { page: 1, pageSize: 16, total: 86, locale: "pt-BR" },
} satisfies Meta<typeof StorefrontResultsCount>

export default meta
type Story = StoryObj<typeof meta>

export const Listagem: Story = {}

/** Na busca, o termo em negrito e na cor de promoção. */
export const Busca: Story = { args: { term: "pré-treino" } }

export const Nenhum: Story = { args: { total: 0, term: "xyz" } }
