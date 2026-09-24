// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { ComponentForm, type ComponentFormValues } from "./component-form"

const empty: ComponentFormValues = {
  kind: "HEADING",
  title: "Novidades da semana",
  subtitle: "Chegou agora",
  body: "",
  display: "CAROUSEL",
  columns: 0,
  align: "CENTER",
  background: "",
  target: "NONE",
  categoryId: "",
  productId: "",
  externalUrl: "",
  slides: [],
  benefits: [],
  fields: [],
}

const meta = {
  title: "Blocos/Modo design/Formulário do componente",
  component: ComponentForm,
  parameters: { layout: "padded" },
  args: {
    value: empty,
    onChange: () => {},
    pageBackground: presets[0]!.colors.background,
    categories: [
      { id: "cat-1", name: "Blusas" },
      { id: "cat-2", name: "Calças" },
    ],
    products: [{ id: "prod-1", name: "Whey 900g" }],
    newItemId: () => `new-${Math.random().toString(36).slice(2, 8)}`,
    onSubmit: () => {},
    onCancel: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComponentForm>

export default meta
type Story = StoryObj<typeof meta>

/** Um título e a linha embaixo dele. Uma placa, não um cartão. */
export const Titulo: Story = {}

/** Um parágrafo. Tipo próprio, e não um modo do título: um formulário com modo são dois formulários. */
export const Paragrafo: Story = {
  args: { value: { ...empty, kind: "TEXT", title: "", subtitle: "", body: "Entregamos em todo o Brasil.\nPeça pelo WhatsApp." } },
}

/**
 * Um banner: uma imagem é um cartaz, várias viram um carousel. Não há interruptor — a forma é
 * lida da quantidade, que é o que o dono pediu em tantas palavras.
 */
export const Banner: Story = {
  args: {
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

/** As categorias em grade ganham o seu ajuste: quantas colunas. */
export const Categorias: Story = {
  args: { value: { ...empty, kind: "CATEGORIES", title: "Categorias", subtitle: "", display: "GRID", columns: 3 } },
}

/** Em trilho, as categorias rolam para o lado, e as colunas não são perguntadas. */
export const CategoriasEmTrilho: Story = {
  args: { value: { ...empty, kind: "CATEGORIES", title: "Categorias", subtitle: "", display: "RAIL", columns: 0 } },
}

/**
 * A barra de aviso: as palavras, e a cor da faixa dela — que é a cor da barra, porque a barra é o
 * único componente cuja faixa não é desenhada onde está. Na loja, esse texto rola na horizontal.
 */
export const BarraDeAviso: Story = {
  args: {
    value: { ...empty, kind: "ANNOUNCEMENT", title: "Frete grátis acima de R$ 199", subtitle: "Só até domingo", background: presets[2]!.colors.primary },
  },
}
