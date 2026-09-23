// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BannerSlidesField } from "./banner-slides-field"

const meta = {
  title: "Blocos/Modo design/Imagens do banner",
  component: BannerSlidesField,
  parameters: { layout: "padded" },
  args: {
    value: [
      {
        id: "s1",
        imageUrl: "https://picsum.photos/seed/slides-a/800/400",
        title: "Frete grátis",
        subtitle: "acima de R$ 199",
        target: "CATEGORY",
        categoryId: "cat-1",
        productId: "",
        externalUrl: "",
      },
      {
        id: "s2",
        imageUrl: "https://picsum.photos/seed/slides-b/800/400",
        title: "Whey 900g",
        subtitle: "",
        target: "PRODUCT",
        categoryId: "",
        productId: "prod-1",
        externalUrl: "",
      },
    ],
    onChange: () => {},
    categories: [
      { id: "cat-1", name: "Blusas" },
      { id: "cat-2", name: "Calças" },
    ],
    products: [{ id: "prod-1", name: "Whey 900g" }],
    newSlideId: () => `new-${Math.random().toString(36).slice(2, 8)}`,
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BannerSlidesField>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Duas imagens: na loja isso é um carousel. Uma seria um cartaz. Não há interruptor — a forma é
 * lida da quantidade. O destino de cada uma é um id, nunca um endereço, para sobreviver a uma
 * categoria renomeada.
 */
export const Carousel: Story = {}

/** Sem imagens ainda: só o convite. */
export const Vazio: Story = { args: { value: [] } }
