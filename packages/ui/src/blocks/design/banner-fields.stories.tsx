// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BannerFields } from "./banner-fields"

const meta = {
  title: "Blocos/Modo design/Campos do banner",
  component: BannerFields,
  parameters: { layout: "padded" },
  args: {
    value: {
      layout: "HALVES",
      display: "CAROUSEL",
      slides: [
        {
          id: "s1",
          imageUrl: "https://picsum.photos/seed/fields-a/800/400",
          title: "Frete grátis",
          subtitle: "acima de R$ 199",
          target: "CATEGORY",
          categoryId: "cat-1",
          productId: "",
          externalUrl: "",
        },
      ],
    },
    onChange: () => {},
    categories: [{ id: "cat-1", name: "Blusas" }],
    products: [{ id: "prod-1", name: "Whey 900g" }],
    newItemId: () => `new-${Math.random().toString(36).slice(2, 8)}`,
  },
  decorators: [
    (Story) => (
      <div className="flex max-w-lg flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BannerFields>

export default meta
type Story = StoryObj<typeof meta>

/** A forma na linha, e as imagens: uma é cartaz, várias são carousel. */
export const Padrao: Story = {}
