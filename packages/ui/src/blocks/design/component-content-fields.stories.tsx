// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ComponentContentFields, type ComponentFormValues } from "./component-content-fields"

const empty: ComponentFormValues = {
  kind: "HEADING",
  title: "Novidades da semana",
  subtitle: "Chegou agora",
  body: "",
  target: "NONE",
  categoryId: "",
  productId: "",
  externalUrl: "",
  slides: [],
  benefits: [],
  fields: [],
  source: "ALL",
  sourceCategoryId: "",
  picks: [],
  limit: "",
  faq: [],
  buttonLabel: "",
}

const meta = {
  title: "Blocos/Modo design/Conteúdo do bloco",
  component: ComponentContentFields,
  parameters: { layout: "padded" },
  args: {
    value: empty,
    onChange: () => {},
    categories: [
      { id: "cat-1", name: "Blusas" },
      { id: "cat-2", name: "Calças" },
    ],
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
} satisfies Meta<typeof ComponentContentFields>

export default meta
type Story = StoryObj<typeof meta>

/** Um título e a linha embaixo dele. Uma placa, não um cartão. O alinhamento é do Layout. */
export const Titulo: Story = {}

/** Um parágrafo. Tipo próprio, e não um modo do título: um formulário com modo são dois formulários. */
export const Paragrafo: Story = {
  args: { value: { ...empty, kind: "TEXT", title: "", subtitle: "", body: "Entregamos em todo o Brasil.\nPeça pelo WhatsApp." } },
}

/** Um banner: as imagens, cada uma com as suas palavras e o seu destino. Carrossel ou grade é do Layout. */
export const Banner: Story = {
  args: {
    display: "GRID",
    value: {
      ...empty,
      kind: "BANNER",
      title: "",
      subtitle: "",
      slides: [
        {
          id: "s1",
          imageUrl: "https://picsum.photos/seed/form-a/800/400",
          title: "Frete grátis",
          subtitle: "acima de R$ 199",
          target: "CATEGORY",
          categoryId: "cat-1",
          productId: "",
          externalUrl: "",
        },
        {
          id: "s2",
          imageUrl: "https://picsum.photos/seed/form-b/800/400",
          title: "",
          subtitle: "",
          target: "EXTERNAL",
          categoryId: "",
          productId: "",
          externalUrl: "https://wa.me/5511999999999",
        },
      ],
    },
  },
}

/** As vantagens, escritas pelo dono. Costumavam ser derivadas das formas de pagamento. */
export const Vantagens: Story = {
  args: {
    value: {
      ...empty,
      kind: "BENEFITS",
      title: "",
      subtitle: "",
      benefits: [
        { id: "b1", icon: "truck", title: "Entrega rápida", detail: "Em até 2 dias" },
        { id: "b2", icon: "qr-code", title: "PIX", detail: "Na hora" },
      ],
    },
  },
}

/** As categorias: só o título. Trilho ou grade, e as colunas, são do Layout. */
export const Categorias: Story = {
  args: { value: { ...empty, kind: "CATEGORIES", title: "Categorias", subtitle: "" } },
}

/**
 * A barra de aviso: as palavras e para onde leva. Na loja, esse texto rola na horizontal. A cor dela
 * é a da faixa, no Estilo.
 */
export const BarraDeAviso: Story = {
  args: {
    value: { ...empty, kind: "ANNOUNCEMENT", title: "Frete grátis acima de R$ 199", subtitle: "Só até domingo", target: "CATEGORY", categoryId: "cat-1" },
  },
}
