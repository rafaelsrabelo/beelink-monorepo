import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { OrderLabelCard } from "./order-label-card"
import { labelBlocked, labelBox, labelGenerated, labelToBuy } from "./order-label.fixtures"

const meta = {
  title: "Blocos/Pedidos/Etiqueta de envio",
  component: OrderLabelCard,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>],
  args: { view: labelToBuy, value: labelBox, onChange: fn(), onBuy: fn(), onPrint: fn(), onCancel: fn() },
} satisfies Meta<typeof OrderLabelCard>

export default meta
type Story = StoryObj<typeof meta>

/** Pronta para comprar: a caixa que o Melhor Envio calculou, e o saldo. */
export const ParaComprar: Story = {}

export const Comprando: Story = { args: { pending: "buy" } }

/** Saldo insuficiente: a etiqueta fica no carrinho, e o caminho para a carteira. */
export const SaldoInsuficiente: Story = {
  args: {
    view: { ...labelToBuy, balance: "R$ 10,00", label: { status: "IN_CART", statusText: "No carrinho do Melhor Envio, esperando o pagamento de R$ 27,45.", protocol: null, trackingCode: null } },
    error: {
      text: "Saldo insuficiente: a carteira tem R$ 10,00 e a etiqueta custa R$ 27,45. Adicione saldo no Melhor Envio (Carteira, Adicionar saldo) e tente de novo. A etiqueta fica guardada no carrinho.",
      href: "https://sandbox.melhorenvio.com.br",
      linkLabel: "Abrir o Melhor Envio",
      external: true,
    },
  },
}

/** Gerada: o rastreio, imprimir e cancelar. */
export const Gerada: Story = { args: { view: labelGenerated } }

/** O que falta antes de comprar. */
export const ComPendencias: Story = { args: { view: labelBlocked } }

export const Cancelada: Story = {
  args: { view: { ...labelToBuy, label: { status: "CANCELLED", statusText: "Cancelada em 2 de out. O valor volta à carteira em até 12 horas.", protocol: "ORD-202610020001", trackingCode: null } } },
}
