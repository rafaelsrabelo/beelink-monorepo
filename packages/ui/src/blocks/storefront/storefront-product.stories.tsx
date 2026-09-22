import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontProductDetail } from "./storefront-product"

const meta = {
  title: "Blocos/Vitrine/Página do produto",
  component: StorefrontProductDetail,
  parameters: { layout: "padded" },
  args: {
    name: "Bolsa Amora",
    description: "Bolsa de crochê feita à mão em fio de algodão, com alça ajustável.",
    priceCents: 18900,
    compareAtPriceCents: 24900,
    images: [
      { id: "i1", url: "https://picsum.photos/seed/a1/800/800", alt: "De frente" },
      { id: "i2", url: "https://picsum.photos/seed/a2/800/800", alt: "Aberta" },
      { id: "i3", url: "https://picsum.photos/seed/a3/800/800", alt: null },
    ],
    categoryName: "Mais vendidos",
    backHref: "/lessari?categoria=mais-vendidos",
    orderHref: "https://wa.me/5585999998888?text=Ol%C3%A1",
    locale: "pt-BR",
  },
} satisfies Meta<typeof StorefrontProductDetail>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** One photograph: no gallery, because there is nothing to choose between. */
export const UmaFoto: Story = {
  args: { images: [{ id: "i1", url: "https://picsum.photos/seed/a1/800/800", alt: null }] },
}

export const SemDesconto: Story = {
  args: { compareAtPriceCents: null },
}

/** A shop with no WhatsApp on file offers no button, rather than one that opens nothing. */
export const SemWhatsapp: Story = {
  args: { orderHref: undefined },
}

/**
 * The shelf is empty. The page still answers — this is the address that went out on WhatsApp — and
 * what it loses is the button, not itself.
 */
export const Esgotado: Story = { args: { soldOut: true } }
