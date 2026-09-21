import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "../../locales/en"
import { StoreCard } from "./store-card"
import { sampleStore, sampleStores } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Cartão da loja",
  component: StoreCard,
  args: {
    store: sampleStore,
    panelHref: "/admin/doces-da-ana",
    storefrontHref: "/doces-da-ana",
  },
} satisfies Meta<typeof StoreCard>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** No logo yet: the initials stand in, so the card never renders a hole. */
export const SemLogo: Story = {
  args: { store: { ...sampleStore, logoUrl: null } },
}

/** A shop that has a logo: the avatar carries the brand instead of the initials. */
export const ComLogo: Story = {
  args: {
    store: sampleStores[1],
    panelHref: "/admin/nutri-suplementos",
    storefrontHref: "/nutri-suplementos",
  },
}

/** Before the shop is published there is nowhere to send a visitor, so the second link is absent. */
export const SemVitrine: Story = {
  args: { storefrontHref: undefined },
}

export const EmIngles: Story = {
  args: { messages: en },
}
