// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontGalleryRail } from "./storefront-gallery-rail"

const meta = {
  title: "Blocos/Vitrine/Galeria · miniaturas",
  component: StorefrontGalleryRail,
  parameters: { layout: "padded" },
  args: {
    images: Array.from({ length: 8 }, (_, at) => ({ id: String(at), url: `https://picsum.photos/seed/haze-${at + 1}/200/200`, alt: null })),
    shown: 0,
    onShow: () => {},
    onMore: () => {},
  },
  render: (args) => {
    const [shown, setShown] = useState(args.shown)
    return <StorefrontGalleryRail {...args} shown={shown} onShow={setShown} />
  },
} satisfies Meta<typeof StorefrontGalleryRail>

export default meta
type Story = StoryObj<typeof meta>

/** Cinco miniaturas e "+3" para as que não cabem. */
export const Padrao: Story = {}
