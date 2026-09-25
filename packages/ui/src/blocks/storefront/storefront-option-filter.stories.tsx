import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontOptionFilter } from "./storefront-option-filter"

const meta = {
  title: "Blocos/Vitrine/Filtro de opção",
  component: StorefrontOptionFilter,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 264 }}>{Story()}</div>],
  args: { locale: "pt-BR" },
} satisfies Meta<typeof StorefrontOptionFilter>

export default meta
type Story = StoryObj<typeof meta>

const entry = (label: string, count: number, selected = false, colorHex: string | null = null) => ({ value: label, label, href: "#", count, selected, colorHex })

/** Sabor em lista, com "Ver mais" depois de cinco. */
export const Lista: Story = {
  args: { title: "Sabor", values: ["Chocolate", "Baunilha", "Morango", "Cookies", "Limão", "Uva", "Coco"].map((label, at) => entry(label, 30 - at * 3, at === 1)) },
}

/** Tamanho em pílulas, uma escolhida. */
export const Pilulas: Story = {
  args: { title: "Tamanho", values: ["300 g", "900 g", "1,8 kg", "2 kg"].map((label, at) => entry(label, 10 - at, at === 1)) },
}
