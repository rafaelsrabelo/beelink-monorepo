// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartCouponCall } from "./storefront-cart-coupon-call"

const call = { message: "Você tem 15% de desconto no primeiro pedido com o cupom", code: "SEJAMUTANTE" }

const meta = {
  title: "Blocos/Vitrine/Carrinho · chamada do cupom",
  component: StorefrontCartCouponCall,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-background)", padding: 16, width: 358 }}>{Story()}</div>],
  args: { call, onApply: () => {} },
} satisfies Meta<typeof StorefrontCartCouponCall>

export default meta
type Story = StoryObj<typeof meta>

/** O cupom de primeira compra do cliente, ainda não aplicado: a frase, o código e um toque. */
export const PrimeiroPedido: Story = {}

/** Um cupom para todos: a frase não fala em primeiro pedido. */
export const CupomParaTodos: Story = { args: { call: { message: "Você tem R$ 15,00 de desconto com o cupom", code: "QUINZE" } } }

/** Frete grátis. */
export const FreteGratis: Story = { args: { call: { message: "Você tem frete grátis no primeiro pedido com o cupom", code: "FRETEGRATIS" } } }

/** O código está sendo conferido: o botão espera. */
export const Conferindo: Story = { args: { pending: true } }

/** Um código de 30 caracteres quebra dentro da caixa. */
export const CodigoComprido: Story = { args: { call: { ...call, code: "UMCODIGOBEMCOMPRIDODETRINTACAR" } } }

/** Numa loja de página escura. */
export const LojaEscura: Story = {
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[1]!.colors), backgroundColor: "var(--shop-background)", padding: 16, width: 358 }}>{Story()}</div>],
}
