// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OrderDeliveryCard } from "./order-delivery-card"
import { OrderFeeCard } from "./order-fee-card"
import { OrderDetail } from "./order-detail"
import { awaitingOnlineOrder, campaignOrder, cashbackOrder, directOrder, order, paidAfterCancelledOrder, paidOnlineOrder } from "./order-detail.fixtures"

const meta = {
  title: "Blocks/Orders/OrderDetail",
  component: OrderDetail,
  args: {
    order,
    backHref: "#",
    deliveryLine: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP — CEP 01310-930",
    whatsappHref: "https://wa.me/5511988887777",
    customerHref: "#ficha-do-cliente",
    onStatusChange: () => {},
  },
  // The page lays itself out by the panel's main column, which the shell declares.
  decorators: [
    (Story) => (
      <div className="@container/main">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderDetail>

export default meta
type Story = StoryObj<typeof meta>

export const Aceito: Story = {}

export const Retirada: Story = {
  args: { order: { ...order, fulfillment: "PICKUP", deliveryAddress: null, deliveryFeeCents: 0, totalCents: 27970, status: "PREPARING" }, deliveryLine: null },
}

/** A delivery placed before orders kept where they went: it says so, never the customer's address of today. */
export const EnderecoNaoRegistrado: Story = { args: { order: { ...order, deliveryAddress: null }, deliveryLine: null } }

/** The customer changed their name since: the order still says who it went to. */
export const OutraPessoaRecebe: Story = {
  args: { order: { ...order, customer: { ...order.customer, name: "Bia Lima" }, deliveryAddress: { ...order.deliveryAddress!, recipientName: "Bia Souza" } } },
}

export const Cancelado: Story = { args: { order: { ...order, status: "CANCELLED" } } }

/** Entregue, com o cashback que gerou: disponível para o cliente até uma data. */
export const ComCashback: Story = { args: { order: cashbackOrder } }

/** Cobrado online e pago (BEELINK-207): o pagamento abre a coluna lateral. */
export const PagoOnline: Story = { args: { order: paidOnlineOrder } }

/** Cobrado online, ainda sem pagamento: a loja pode seguir, mas vê que aguarda. */
export const AguardandoPagamento: Story = { args: { order: awaitingOnlineOrder } }

/** Cancelado e pago depois: o dinheiro indevido fica desenhado no pedido, com o que fazer. */
export const PagoDepoisDeCancelado: Story = { args: { order: paidAfterCancelledOrder } }

export const SemCelular: Story = { args: { order: { ...order, customer: { ...order.customer, phone: null } }, whatsappHref: null } }

export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** Saiu para entrega sem entrega informada: o bloco pede quem entrega e quando chega. */
export const SaiuSemEntrega: Story = {
  args: {
    order: { ...order, status: "OUT_FOR_DELIVERY" },
    delivery: <OrderDeliveryCard delivery={null} onSave={() => {}} onClear={() => {}} needed />,
  },
}

/** O pedido do carrinho, com o frete ainda a combinar: o total diz "+ frete", e o card lança o valor (BEELINK-170). */
export const FreteACombinar: Story = {
  args: {
    order: { ...order, status: "RECEIVED", deliveryFeeCents: null, totalCents: 27970 },
    delivery: <OrderFeeCard feeCents={null} onSave={() => {}} />,
  },
}

/** A entrega informada: transportadora, código e a janela de chegada. */
export const ComEntrega: Story = {
  args: {
    order: { ...order, status: "OUT_FOR_DELIVERY" },
    delivery: (
      <OrderDeliveryCard
        delivery={{ kind: "CARRIER", carrier: "Correios", service: "SEDEX", trackingCode: "AB123456789BR", trackingUrl: null, estimateFrom: "2026-09-25", estimateTo: "2026-09-26" }}
        onSave={() => {}}
        onClear={() => {}}
        saved
      />
    ),
  },
}

/** O pedido do carrinho de quem veio por um anúncio da Meta: a linha "Origem" diz a campanha, nunca o identificador do clique (BEELINK-275). */
export const ComOrigem: Story = { args: { order: campaignOrder } }

/** O pedido do carrinho de quem não veio por campanha nenhuma. */
export const OrigemDireta: Story = { args: { order: directOrder } }
