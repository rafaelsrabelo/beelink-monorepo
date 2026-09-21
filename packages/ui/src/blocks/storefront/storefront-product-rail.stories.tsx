import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontProductRail } from "./storefront-product-rail"

/** Twelve, which is what the shop the owner pointed at runs under its own "Destaques". */
const products = Array.from({ length: 12 }, (_, index) => ({
  id: `p${index + 1}`,
  slug: `bolsa-${index + 1}`,
  name: `Bolsa ${index + 1}`,
  priceCents: 8900 + index * 1500,
  compareAtPriceCents: index % 3 === 0 ? 24900 : null,
  imageUrl: index === 4 ? null : `https://picsum.photos/seed/rail${index}/600/600`,
}))

const meta = {
  title: "Blocos/Vitrine/Trilho de produtos",
  component: StorefrontProductRail,
  parameters: { layout: "padded" },
  args: {
    products,
    productHref: (slug: string) => `/lessari/produtos/${slug}`,
    locale: "pt-BR",
    seeAllHref: "/lessari/produtos",
  },
  // The shop colours are set here because the band borrows them for the way out and for the ring
  // it draws when a keyboard lands on it; outside a shop window nothing defines them.
  decorators: [
    (Story) => (
      <div style={{ "--shop-primary": "oklch(0.55 0.18 25)" } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontProductRail>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/**
 * A phone, boxed at 360px because this package has no viewport addon: two cards and a peek of the
 * third, which is the only thing saying the row continues — there are no arrows, since an arrow
 * that needs JavaScript is a dead arrow on a page that has to work before any arrives.
 */
export const NoTelefone: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 360, overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
}

/** A shop with four things: the band fills and never scrolls, and nothing about it changes. */
export const PoucosProdutos: Story = {
  args: { products: products.slice(0, 4) },
}

/** A band of a category rather than the home's selection: the title names the region too. */
export const TituloProprio: Story = {
  args: { title: "Mais vendidos", seeAllHref: "/lessari/mais-vendidos" },
}

/** No catalogue to send anyone to yet — the band stands on its own, with no door. */
export const SemVerTodos: Story = {
  args: { seeAllHref: undefined },
}

/** A shop that quotes instead of pricing — the numbers come off, the band stays. */
export const SemPrecos: Story = {
  args: { showPrice: false },
}

/** Nothing to show: the band renders nothing at all, title included. The screen says what to say. */
export const Vazio: Story = {
  args: { products: [] },
}
