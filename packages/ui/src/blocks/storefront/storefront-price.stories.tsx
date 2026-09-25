// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontDiscountBadge, StorefrontPrice, type StorefrontPriceSize } from "./storefront-price"

const PRICES = [890, 11990, 129990]
const SIZES: StorefrontPriceSize[] = ["card", "product", "buyBox", "compact"]

const meta = {
  title: "Blocos/Vitrine/Preço",
  component: StorefrontPrice,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { priceCents: 11990, compareAtPriceCents: 14990, locale: "pt-BR" },
} satisfies Meta<typeof StorefrontPrice>

export default meta
type Story = StoryObj<typeof meta>

/** R$ 8,90, R$ 119,90 e R$ 1.299,90 em cada tamanho, com e sem desconto. */
export const TodosOsTamanhos: Story = {
  render: (args) => (
    <div className="flex flex-col gap-8">
      {SIZES.map((size) => (
        <section key={size} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase text-shop-muted">{size}</p>
          <div className="flex flex-wrap items-end gap-10">
            {PRICES.map((cents) => (
              <StorefrontPrice key={cents} {...args} priceCents={cents} compareAtPriceCents={Math.round(cents * 1.25)} size={size} />
            ))}
            <StorefrontPrice {...args} priceCents={11990} compareAtPriceCents={null} size={size} />
          </div>
        </section>
      ))}
    </div>
  ),
}

/** O selo sobre uma foto: no canto do card, e no canto da foto grande do produto. */
export const SeloSobreAFoto: Story = {
  render: (args) => (
    <div className="flex gap-6">
      <div className="relative h-56 w-64 rounded-xl bg-shop-placeholder">
        <StorefrontDiscountBadge priceCents={args.priceCents} compareAtPriceCents={args.compareAtPriceCents ?? null} />
      </div>
      <div className="relative h-72 w-64 rounded-2xl bg-shop-placeholder">
        <StorefrontDiscountBadge priceCents={args.priceCents} compareAtPriceCents={args.compareAtPriceCents ?? null} placement="photo" />
      </div>
    </div>
  ),
}
