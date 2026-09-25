import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { ORDER_VARIANT_MARK } from "../../lib/variant-choice"

import { StorefrontProductDetail } from "./storefront-product"
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "./variant-choice-fixtures"

const meta = {
  title: "Blocos/Vitrine/Página do produto",
  component: StorefrontProductDetail,
  parameters: { layout: "padded" },
  args: {
    shopName: "Lessari",
    homeHref: "#",
    name: "Bolsa Amora",
    description: "Bolsa de crochê feita à mão em fio de algodão, com alça ajustável.",
    priceCents: 18900,
    compareAtPriceCents: 24900,
    images: [
      { id: "i1", url: "https://picsum.photos/seed/a1/800/800", alt: "De frente" },
      { id: "i2", url: "https://picsum.photos/seed/a2/800/800", alt: "Aberta" },
      { id: "i3", url: "https://picsum.photos/seed/a3/800/800", alt: null },
    ],
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

/** Tamanho e cor: o preço, a foto e a mensagem mudam com a escolha, e M esgotado oferece o Avise-me. */
export const ComVariacoes: Story = {
  args: {
    options: BLOUSE_OPTIONS,
    variants: BLOUSE_VARIANTS,
    orderHref: `https://wa.me/5511999998888?text=Blusa${ORDER_VARIANT_MARK}`,
    restock: { onSubmit: () => {}, status: "idle" },
  },
}

/** Fotos marcadas por cor: a galeria mostra as da cor escolhida e a geral, e troca com a escolha. */
export const FotosPorCor: Story = {
  args: {
    options: BLOUSE_OPTIONS,
    variants: BLOUSE_VARIANTS.map((variant) => ({ ...variant, imageUrl: null })),
    images: [
      { id: "areia", url: "https://picsum.photos/seed/areia/800/800", alt: "Areia de frente", optionValueIds: ["areia"] },
      { id: "terracota", url: "https://picsum.photos/seed/terracota/800/800", alt: "Terracota de frente", optionValueIds: ["terracota"] },
      { id: "preto", url: "https://picsum.photos/seed/preto/800/800", alt: "Preto de frente", optionValueIds: ["preto"] },
      { id: "geral", url: "https://picsum.photos/seed/etiqueta/800/800", alt: "A etiqueta", optionValueIds: [] },
    ],
    orderHref: `https://wa.me/5511999998888?text=Blusa${ORDER_VARIANT_MARK}`,
  },
}
