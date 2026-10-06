// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderPaymentCard } from "./order-payment-card"
import { paidAfterCancelled, paidCard, paidPix, paidTwice, pendingPix, refused } from "./order-payment.fixtures"

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
const when = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso))

const meta = {
  title: "Blocks/Orders/OrderPaymentCard",
  component: OrderPaymentCard,
  parameters: { layout: "padded" },
  args: { payment: pendingPix, money, when },
  decorators: [(Story) => <div className="max-w-xs">{Story()}</div>],
} satisfies Meta<typeof OrderPaymentCard>

export default meta
type Story = StoryObj<typeof meta>

/** Um Pix gerado e ainda não pago: a situação e até quando vence. */
export const Aguardando: Story = {}

/** O cliente ainda não gerou a cobrança (frete a combinar, ou o Asaas falhou no checkout). */
export const SemCobranca: Story = { args: { payment: null } }

/** Pix pago: quando foi, e que o valor já está na conta. */
export const PagoNoPix: Story = { args: { payment: paidPix } }

/** Cartão aprovado em 3x: pago, com o valor ainda preso no Asaas. */
export const PagoNoCartao: Story = { args: { payment: paidCard } }

/** Vencido: o cliente pode gerar outra cobrança pelo pedido. */
export const Vencido: Story = { args: { payment: { ...pendingPix, status: "OVERDUE", providerStatus: "OVERDUE" } } }

/** O Asaas está analisando o cartão: a palavra dele diz mais que a nossa. */
export const EmAnalise: Story = { args: { payment: { ...pendingPix, method: "CREDIT_CARD", providerStatus: "AWAITING_RISK_ANALYSIS" } } }

/** O Asaas recusou criar a cobrança: o motivo, nas palavras dele. */
export const Recusado: Story = { args: { payment: refused } }

/** Pago depois de cancelado: o aviso fixo, com o que a loja faz. */
export const PagoDepoisDeCancelado: Story = { args: { payment: paidAfterCancelled } }

/** Pago duas vezes: o segundo pagamento a estornar. */
export const PagoDuasVezes: Story = { args: { payment: paidTwice } }

/** Estornado por inteiro. */
export const Estornado: Story = { args: { payment: { ...paidPix, status: "REFUNDED", providerStatus: "REFUNDED" } } }
