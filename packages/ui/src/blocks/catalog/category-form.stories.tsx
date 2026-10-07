import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { categoryArt, categoryBannerArt } from "../storefront/category-art.fixtures"
import { CategoryForm, type CategoryFormValues } from "./category-form"

const empty: CategoryFormValues = { name: "", slug: "", description: "", imageUrl: "", bannerUrl: "", parentId: "", isActive: true }

const meta = {
  title: "Blocos/Catálogo/Formulário de categoria",
  component: CategoryForm,
  parameters: { layout: "padded" },
  args: {
    value: empty,
    onChange: () => {},
    parents: [{ id: "p1", name: "Casa e construção" }],
    shopSlug: "lessari",
    onSubmit: () => {},
    onCancel: () => {},
  },
  // The form is controlled: the story holds the value so typing and clearing can be tried.
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <CategoryForm {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof CategoryForm>

export default meta
type Story = StoryObj<typeof meta>

/** Uma categoria nova: a imagem do cartão e o banner da página, cada um com o tamanho recomendado. */
export const Nova: Story = {}

/** Com as duas imagens: o cartão quadrado e o banner na proporção em que a página o mostra (4:1). */
export const ComImagemEBanner: Story = {
  args: {
    value: {
      ...empty,
      name: "Ferramentas",
      slug: "ferramentas",
      imageUrl: categoryArt("Ferramentas", "até 41% OFF", "seagreen"),
      bannerUrl: categoryBannerArt("Ferramentas Elétricas", "seagreen"),
    },
  },
}

/** Uma subcategoria: a ajuda do banner diz que, sem um próprio, ela mostra o da categoria em que está. */
export const Subcategoria: Story = {
  args: { value: { ...empty, name: "Furadeiras", slug: "furadeiras", parentId: "p1" } },
}
