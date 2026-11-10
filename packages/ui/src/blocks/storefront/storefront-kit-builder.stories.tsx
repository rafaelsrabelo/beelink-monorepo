import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontKitBuilder } from "./storefront-kit-builder"

const flavours = ["Ninho com Nutella", "Paçoquinha", "Mousse de maracujá", "Chocolate Trufado", "Ninho Trufado", "Pudim com calda", "Castanha", "Chicabom", "Kit Kat", "Ovomaltine"]

const meta = {
  title: "Blocos/Vitrine/Monte seu kit",
  component: StorefrontKitBuilder,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 520 }}>{Story()}</div>],
  args: {
    size: 20,
    parts: flavours.map((name, at) => ({ key: String(at), name, imageUrl: `https://picsum.photos/seed/dindin-${at}/120/120`, available: at !== 4 })),
    counts: {},
    onChange: () => {},
  },
  render: function Render(args) {
    const [counts, setCounts] = useState<Record<string, number>>(args.counts)
    return <StorefrontKitBuilder {...args} counts={counts} onChange={(key, count) => setCounts((now) => ({ ...now, [key]: count }))} />
  },
} satisfies Meta<typeof StorefrontKitBuilder>

export default meta
type Story = StoryObj<typeof meta>

/** Um kit de 20 dindins: escolha os sabores, pode repetir. Um esgotado aparece marcado. */
export const Padrao: Story = {}

/** No meio do caminho: 12 de 20. */
export const EmAndamento: Story = { args: { counts: { "0": 6, "1": 4, "2": 2 } } }

/** A categoria do kit foi escondida ou apagada: não há o que escolher. */
export const SemItens: Story = { args: { parts: [] } }
