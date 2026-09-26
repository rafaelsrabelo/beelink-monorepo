// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontCallToAction } from "./storefront-call-to-action"

const meta = {
  title: "Blocos/Vitrine/Chamada final",
  component: StorefrontCallToAction,
  parameters: { layout: "padded" },
  args: {
    layout: "BAND",
    title: "Garanta o seu",
    body: "Frete grátis nas compras acima de R$ 199.",
    button: { label: "Comprar agora", href: "/loja/produtos/whey", external: false },
  },
} satisfies Meta<typeof StorefrontCallToAction>

export default meta
type Story = StoryObj<typeof meta>

/** Uma faixa da cor da loja; o botão invertido lê bem qualquer que seja a cor. */
export const Faixa: Story = {}

/** Ponta a ponta, numa faixa larga: sem cantos arredondados. */
export const FaixaPontaAPonta: Story = { args: { bleed: true }, parameters: { layout: "fullscreen" } }

/** Um cartão tingido dentro das margens da página. */
export const Cartao: Story = { args: { layout: "CARD" } }

/** O produto foi apagado: a chamada continua, sem botão. */
export const SemBotao: Story = { args: { button: { label: "Comprar agora", href: null, external: false } } }
