// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderRefundForm } from "./order-refund-form"

const meta = {
  title: "Blocks/Orders/OrderRefundForm",
  component: OrderRefundForm,
  parameters: { layout: "padded" },
  args: { number: 12, kind: "payment", method: "PIX", paidCents: 15990, refundedCents: 0, refundingCents: 0, refundableCents: 15990, backHref: "#pedido", onSubmit: () => {} },
  decorators: [(Story) => <div className="max-w-xl">{Story()}</div>],
} satisfies Meta<typeof OrderRefundForm>

export default meta
type Story = StoryObj<typeof meta>

/** Um Pix pago: o valor começa em tudo o que resta, e a loja pode digitar menos. */
export const Pix: Story = {}

/** Cartão já estornado em parte: o que voltou, o que resta, e o prazo do cartão. */
export const CartaoEmParte: Story = { args: { method: "CREDIT_CARD", refundedCents: 5000, refundableCents: 10990 } }

/** Cancelar um pedido pago: o valor é tudo o que resta, e só o motivo é pedido. */
export const CancelarPedido: Story = { args: { kind: "cancel" } }

/** Dinheiro que o pedido não pediu. */
export const PagamentoIndevido: Story = { args: { kind: "stray" } }

/** O Asaas recusou por falta de saldo. */
export const Recusado: Story = { args: { error: "A sua conta Asaas não tem saldo para este estorno. As taxas da cobrança não voltam: espere novos recebimentos ou estorne um valor menor." } }

/** Enviando: o botão fica focável e não envia de novo. */
export const Enviando: Story = { args: { pending: true } }

/** Nada a estornar: tudo já voltou ou está voltando. */
export const NadaAEstornar: Story = { args: { refundedCents: 15990, refundableCents: 0 } }
