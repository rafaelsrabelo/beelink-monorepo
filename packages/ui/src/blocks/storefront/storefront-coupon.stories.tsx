import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCoupon } from "./storefront-coupon"

const meta = {
  title: "Blocos/Vitrine/Cupom",
  component: StorefrontCoupon,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-background)", padding: 20, maxWidth: 320 }}>{Story()}</div>
    ),
  ],
  args: { applied: null },
} satisfies Meta<typeof StorefrontCoupon>

export default meta
type Story = StoryObj<typeof meta>

/** O campo, antes de qualquer código. */
export const Campo: Story = {}

/** O código está sendo conferido: o campo fica como está e o botão espera. */
export const Conferindo: Story = { args: { pending: true } }

/** O código não entrou, e a frase diz por quê. */
export const Recusado: Story = { args: { error: "Esse cupom venceu." } }

/** O cupom entrou e está contando nos totais. */
export const Aplicado: Story = { args: { applied: "BEMVINDO10", holding: true } }

/** O carrinho mudou e o cupom guardado deixou de valer: ele fica, com o motivo. */
export const AplicadoSemValer: Story = {
  args: { applied: "BEMVINDO10", error: "Esse cupom vale para compras a partir de R$ 100,00 em produtos." },
}

/** Sem ninguém identificado: só a frase. */
export const Visitante: Story = { args: { signedOut: true } }

/** Visitante numa loja com cupom de primeira compra: o benefício, sem código, antes da frase (BEELINK-311). */
export const VisitanteComBeneficio: Story = { args: { signedOut: true, signedOutBenefit: "Crie sua conta e ganhe 15% de desconto no primeiro pedido." } }

/** O cliente tem um cupom que ainda não aplicou: a chamada fica sobre o campo (BEELINK-311). */
export const ComChamada: Story = { args: { call: { message: "Você tem 15% de desconto no primeiro pedido com o cupom", code: "SEJAMUTANTE" } } }
