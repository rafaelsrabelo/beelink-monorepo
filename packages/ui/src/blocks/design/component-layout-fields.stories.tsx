// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ComponentLayoutFields } from "./component-layout-fields"

const meta = {
  title: "Blocos/Modo design/Layout do bloco",
  component: ComponentLayoutFields,
  parameters: { layout: "padded" },
  args: {
    kind: "BANNER",
    value: { span: "HALF", display: "CAROUSEL", columns: 0, align: "LEFT", visibleOn: "ALL", cardStyle: "PHOTO_WITH_NAME" },
    onChange: () => {},
    bandWidth: "CONTAINED",
  },
  decorators: [
    (Story) => (
      <div className="flex w-85 flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComponentLayoutFields>

export default meta
type Story = StoryObj<typeof meta>

/** Um banner: a fatia da faixa e se as fotos se revezam ou dividem o espaço. */
export const Banner: Story = {}

/** Uma vitrine em grade ganha a pergunta de quantas colunas; em trilho, não. */
export const VitrineEmGrade: Story = {
  args: { kind: "PRODUCTS", value: { span: "FULL", display: "GRID", columns: 4, align: "LEFT", visibleOn: "ALL", cardStyle: "PHOTO_WITH_NAME" }, bandWidth: "FULL" },
}

/** As categorias em trilho, com a foto e o nome: o estilo de sempre. */
export const Categorias: Story = {
  args: { kind: "CATEGORIES", value: { span: "FULL", display: "RAIL", columns: 0, align: "LEFT", visibleOn: "ALL", cardStyle: "PHOTO_WITH_NAME" }, bandWidth: "FULL" },
}

/** As categorias só com a arte: a linha de ajuda diz o tamanho da imagem e o que acontece sem ela. */
export const CategoriasSoAArte: Story = {
  args: { kind: "CATEGORIES", value: { span: "FULL", display: "GRID", columns: 4, align: "LEFT", visibleOn: "ALL", cardStyle: "ART_ONLY" }, bandWidth: "FULL" },
}

/** Um título: a fatia e o alinhamento — ele não tem formato. */
export const Titulo: Story = {
  args: { kind: "HEADING", value: { span: "FULL", display: null, columns: 0, align: "CENTER", visibleOn: "ALL", cardStyle: "PHOTO_WITH_NAME" } },
}
