// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAnnouncement } from "./storefront-announcement"

const meta = {
  title: "Blocos/Vitrine/Barra de aviso",
  component: StorefrontAnnouncement,
  parameters: { layout: "fullscreen" },
  args: { messages: ["Toda linha Mutante com 20% de desconto", "Frete grátis acima de R$ 199"] },
} satisfies Meta<typeof StorefrontAnnouncement>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Como o design desenha: as mensagens lado a lado, paradas e centralizadas, em maiúsculas. Num
 * celular, onde não cabem, voltam a correr de ponta a ponta em velocidade constante — e com
 * "reduzir movimento" ligado no sistema, nada se move em largura nenhuma.
 */
export const Padrao: Story = {}

/** Uma mensagem só, curta. */
export const Curta: Story = { args: { messages: ["Só hoje: 5% off no Pix"] } }

/**
 * Na cor da faixa dela. A tinta é derivada — o dono escolhe a cor da barra, nunca a cor do texto,
 * pela mesma regra do resto da vitrine.
 */
export const Colorida: Story = { args: { background: sampleColorPresets[2]!.colors.primary } }

/** Com destino: a barra inteira é um link, como um cartaz. */
export const ComLink: Story = { args: { href: "/lessari/frete-gratis", background: sampleColorPresets[3]!.colors.primary } }
