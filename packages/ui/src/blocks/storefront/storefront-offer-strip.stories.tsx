// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontOfferStrip } from "./storefront-offer-strip"

const meta = {
  title: "Blocos/Vitrine/Faixa de oferta",
  component: StorefrontOfferStrip,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { message: "Crie sua conta para acompanhar seus pedidos, salvar favoritos e comprar mais rápido.", action: { label: "Criar conta", href: "#criar" }, onDismiss: () => {} },
} satisfies Meta<typeof StorefrontOfferStrip>

export default meta
type Story = StoryObj<typeof meta>

/** Visitante, loja sem benefício de primeira compra: o convite simples. */
export const VisitanteConvite: Story = {}

/** Visitante, loja com benefício de primeira compra: a frase diz o benefício, nunca um código. */
export const VisitanteComBeneficio: Story = {
  args: { message: "Crie sua conta e ganhe 10% de desconto no primeiro pedido.", detail: "Em compras a partir de R$ 50,00." },
}

/** Cliente sem pedido, loja com cupom de primeira compra mostrado: o código, copiar e "Usar no carrinho". */
export const PrimeiroPedidoComCupom: Story = {
  args: { message: "Seu primeiro pedido tem 10% de desconto com o cupom", code: "PRIMEIRA10", action: { label: "Usar no carrinho", href: "#carrinho" } },
}

/** Cliente sem pedido, loja com promoção de primeira compra: aplica sozinha, nada a apertar. */
export const PrimeiroPedidoComPromocao: Story = {
  args: { message: "Seu primeiro pedido tem 15% de desconto, aplicado automaticamente.", action: null },
}

/** Sem como fechar: a tela não passou `onDismiss`. */
export const SemFechar: Story = { args: { onDismiss: undefined } }

/** Num celular: a frase em cima, as ações embaixo, o fechar no canto. */
export const NoCelular: Story = {
  args: { message: "Seu primeiro pedido tem R$ 15,00 de desconto com o cupom", code: "BEMVINDO-PRIMEIRA-COMPRA", detail: "Em compras a partir de R$ 50,00.", action: { label: "Usar no carrinho", href: "#carrinho" } },
  decorators: [(Story) => <div className="max-w-[390px]">{Story()}</div>],
}
