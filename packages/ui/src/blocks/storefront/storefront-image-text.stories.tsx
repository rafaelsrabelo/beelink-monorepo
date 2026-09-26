// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontImageText } from "./storefront-image-text"

const meta = {
  title: "Blocos/Vitrine/Imagem e texto",
  component: StorefrontImageText,
  parameters: { layout: "padded" },
  args: {
    layout: "IMAGE_LEFT",
    title: "Feito à mão, peça por peça",
    body: "Cada bolsa leva dois dias de trabalho.\nO couro vem de curtumes do interior de Minas.",
    media: {
      imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900",
      alt: "Uma bolsa de couro caramelo sobre a mesa de trabalho",
      button: { label: "Ver a coleção", href: "/loja/bolsas", external: false },
    },
  },
} satisfies Meta<typeof StorefrontImageText>

export default meta
type Story = StoryObj<typeof meta>

/** A imagem à esquerda; no celular, empilha com a imagem em cima. */
export const ImagemAEsquerda: Story = {}

/** A imagem passa para a direita só quando há lado para isso. */
export const ImagemADireita: Story = { args: { layout: "IMAGE_RIGHT" } }

/** Sem imagem, só as palavras. */
export const SoTexto: Story = { args: { media: null } }

/** Num terço da faixa não cabe lado a lado: empilha. */
export const NumTerco: Story = { args: { span: "THIRD" } }
