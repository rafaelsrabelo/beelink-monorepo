import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "../../locales/en"
import { StorefrontSearch } from "./storefront-search"

const meta = {
  title: "Blocos/Vitrine/Busca",
  component: StorefrontSearch,
  parameters: { layout: "padded" },
  args: { action: "/padaria-da-ana/busca" },
} satisfies Meta<typeof StorefrontSearch>

export default meta
type Story = StoryObj<typeof meta>

/** How it sits in the header: empty, and with the caret left where the visitor put it. */
export const Padrao: Story = {}

/** Over the results, which is the one place it may take the caret and say the term back. */
export const NaPaginaDeBusca: Story = {
  args: { value: "bolo de cenoura", autoFocus: true },
}

/** A screen that has to carry something to the results page pins it to the form. */
export const ComCampoFixo: Story = {
  args: { hidden: { categoria: "promocoes" } },
}

/**
 * The shop that switched its route words to English. The word in the path moves; the key the term
 * travels under does not, because the contract promises `?q=` in both languages.
 */
export const EmIngles: Story = {
  args: { action: "/ana-bakery/search", messages: en },
}
