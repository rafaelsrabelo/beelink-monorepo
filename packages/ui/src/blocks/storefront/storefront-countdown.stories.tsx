// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontCountdown } from "./storefront-countdown"

const END = "2026-10-01T02:59:00.000Z"

const meta = {
  title: "Blocos/Vitrine/Contagem regressiva",
  component: StorefrontCountdown,
  parameters: { layout: "padded" },
  args: {
    layout: "BAND",
    title: "A oferta termina em",
    subtitle: "Frete grátis só até lá",
    endsAt: END,
    now: Date.parse(END) - ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000,
  },
} satisfies Meta<typeof StorefrontCountdown>

export default meta
type Story = StoryObj<typeof meta>

/** Uma faixa da cor da loja. Os dígitos não são lidos a cada segundo; a data de término é dita uma vez. */
export const Faixa: Story = {}

/** Uma caixa que cabe num terço da faixa. */
export const Bloco: Story = { args: { layout: "BLOCK" } }

/** Antes do script da página: traços no lugar dos dígitos, e a data à vista. */
export const AntesDoScript: Story = { args: { now: null } }

/** No editor, depois do fim: a loja não mostra mais, e o lojista vê por quê. */
export const Encerrada: Story = { args: { now: Date.parse(END), ended: true } }
