import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontBreadcrumb } from "./storefront-breadcrumb"

const meta = {
  title: "Blocos/Vitrine/Trilha",
  component: StorefrontBreadcrumb,
  parameters: { layout: "padded" },
  args: {
    homeHref: "/lessari",
    items: [
      { label: "Todos os produtos", href: "/lessari/produtos" },
      { label: "Proteínas", href: "/lessari/proteinas" },
      { label: "Whey Protein Concentrado 900g" },
    ],
  },
} satisfies Meta<typeof StorefrontBreadcrumb>

export default meta
type Story = StoryObj<typeof meta>

/** Um produto, que é o caso mais fundo: loja, catálogo, categoria, produto. */
export const Produto: Story = {}

/** Uma prateleira: dois passos e pronto. */
export const Categoria: Story = {
  args: { items: [{ label: "Todos os produtos", href: "/lessari/produtos" }, { label: "Proteínas" }] },
}
