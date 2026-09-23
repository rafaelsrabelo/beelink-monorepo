// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAnnouncement } from "./storefront-announcement"

const meta = {
  title: "Blocos/Vitrine/Barra de aviso",
  component: StorefrontAnnouncement,
  parameters: { layout: "fullscreen" },
  args: { left: "Frete grátis acima de R$ 199", right: "Só até domingo" },
} satisfies Meta<typeof StorefrontAnnouncement>

export default meta
type Story = StoryObj<typeof meta>

/**
 * As pedido: o texto fica rolando na horizontal, em velocidade constante — uma frase curta não
 * corre e uma longa não se arrasta. Pausa quando o mouse passa por cima. Com "reduzir movimento"
 * ligado no sistema, nada se move: a frase fica parada, centrada.
 */
export const Padrao: Story = {}

/** Uma frase só, curta: mais cópias na trilha, mesma velocidade. */
export const Curta: Story = { args: { left: "Oi", right: undefined } }

/**
 * Na cor da faixa dela. A tinta é derivada — o dono escolhe a cor da barra, nunca a cor do texto,
 * pela mesma regra do resto da vitrine.
 */
export const Colorida: Story = { args: { background: sampleColorPresets[2]!.colors.primary } }
