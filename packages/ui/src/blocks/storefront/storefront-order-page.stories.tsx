import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontOrderAddress } from "./storefront-order-address"
import { StorefrontOrderHeader } from "./storefront-order-header"
import { StorefrontOrderHistory, type StorefrontOrderHistoryEvent } from "./storefront-order-history"
import { StorefrontOrderItems } from "./storefront-order-items"
import { StorefrontOrderLayout } from "./storefront-order-layout"
import { StorefrontOrderPayment } from "./storefront-order-payment"
import { StorefrontOrderReceipt } from "./storefront-order-receipt"
import { StorefrontOrderStatus, type StorefrontOrderStatusProps } from "./storefront-order-status"
import type { StorefrontOrderStep } from "./storefront-order-steps"
import { StorefrontOrderTracking } from "./storefront-order-tracking"

const steps: StorefrontOrderStep[] = [
  { label: "Pedido feito", when: "21 de set., 14:02", state: "done" },
  { label: "Loja confirmou", when: "21 de set., 15:10", state: "done" },
  { label: "Em preparo", when: "22 de set., 10:30", state: "done" },
  { label: "Saiu para entrega", when: "23 de set., 08:40", state: "current" },
  { label: "Entregue", when: null, state: "todo" },
]

const events: StorefrontOrderHistoryEvent[] = [
  { day: "23 de set.", time: "08:40", title: "Saiu para entrega", detail: null },
  { day: "22 de set.", time: "10:30", title: "Em preparo", detail: null },
  { day: "21 de set.", time: "15:10", title: "Loja confirmou", detail: null },
  { day: "21 de set.", time: "14:02", title: "Pedido feito", detail: "Feito por você na loja" },
]

const items = [
  { name: "Pré-Treino Haze Hardcore 300g", href: "#", imageUrl: null, meta: "Sabor: Frutas vermelhas · Qtd. 1", price: "R$ 119,90" },
  { name: "Creatina Monohidratada 300g", href: "#", imageUrl: null, meta: "Qtd. 2 · R$ 49,95 cada", price: "R$ 99,90" },
  { name: "Coqueteleira 700ml", href: null, imageUrl: null, meta: "Cor: Preta · Qtd. 1", price: "R$ 29,90" },
]

type Paid = Pick<Parameters<typeof StorefrontOrderPayment>[0], "method" | "status" | "payHref">

function OrderPage({ status, pickup = false, cashback = null, paid = { method: "Pagamento combinado com a loja: Pix" } }: { status: StorefrontOrderStatusProps; pickup?: boolean; cashback?: string | null; paid?: Paid }) {
  return (
    <StorefrontOrderLayout
      header={
        <StorefrontOrderHeader
          number={1042}
          placed="Feito por você na loja em 21 de set. de 2026, 14:02."
          trail={[
            { label: "Minha conta", href: "#" },
            { label: "Meus pedidos", href: "#" },
          ]}
          homeHref="#"
          backHref="#"
          receiptHref="#"
        />
      }
      status={<StorefrontOrderStatus {...status} />}
      history={<StorefrontOrderHistory events={events} />}
      aside={
        <>
          <StorefrontOrderItems count={4} items={items} />
          <StorefrontOrderPayment
            rows={[
              { label: "Subtotal", value: "R$ 249,70" },
              ...(pickup ? [] : [{ label: "Entrega", value: "Grátis", positive: true }]),
              { label: "Promoção: Semana do Whey", value: "− R$ 7,49", positive: true },
              { label: "Cupom BEMVINDO5", value: "− R$ 4,99", positive: true },
            ]}
            total="R$ 237,22"
            {...paid}
            cashback={cashback}
          />
          {pickup ? (
            <StorefrontOrderAddress title="Retirada na loja" lines={["Loja do Design"]} />
          ) : (
            <StorefrontOrderAddress title="Endereço de entrega" lines={["Rafael Souza", "Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles — Fortaleza/CE — CEP 60160-230"]} />
          )}
        </>
      }
    />
  )
}

const meta = {
  title: "Blocos/Vitrine/Pedido do cliente",
  component: OrderPage,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: "0 32px" }}>{Story()}</div>],
  args: { status: { headline: "Saiu para entrega", detail: "Atualizado em 23 de set., 08:40", tone: "progress", steps } },
} satisfies Meta<typeof OrderPage>

export default meta
type Story = StoryObj<typeof meta>

/** 6e: a caminho, com as etapas, o histórico e a coluna de itens, pagamento e endereço. */
export const EmAndamento: Story = {}

/** 6e com a entrega informada: a janela de chegada e a transportadora com o código para copiar. */
export const ComRastreio: Story = {
  args: {
    status: {
      headline: "Saiu para entrega",
      detail: "Chega entre qui., 25 e sex., 26 de set.",
      tone: "progress",
      steps,
      tracking: <StorefrontOrderTracking by="Correios · SEDEX" code="AB123456789BR" href="#" hrefLabel="Ver no site da transportadora" />,
    },
  },
}

/** Pago online e aguardando (BEELINK-205): o pagamento diz onde está e leva à tela de pagar. A etapa do pagamento (BEELINK-207) é a atual e diz que aguarda. */
export const AguardandoPagamento: Story = {
  args: {
    status: {
      headline: "Pedido recebido",
      detail: "A loja confirma em breve.",
      tone: "progress",
      steps: [
        { label: "Pedido feito", when: "21 de set., 14:02", state: "done" },
        { label: "Aguardando pagamento", when: null, state: "current" },
        { label: "Loja confirmou", when: null, state: "todo" },
        { label: "Em preparo", when: null, state: "todo" },
        { label: "Saiu para entrega", when: null, state: "todo" },
        { label: "Entregue", when: null, state: "todo" },
      ],
    },
    paid: { method: "Pagamento online: Pix", status: { label: "Aguardando pagamento", tone: "wait" }, payHref: "#" },
  },
}

/** Pago online, aprovado: sem mais nada a pagar, e a etapa "Pagamento aprovado" marcada com a data (BEELINK-207). */
export const PagamentoAprovado: Story = {
  args: {
    status: {
      headline: "Em preparo",
      detail: "Atualizado em 22 de set., 10:30",
      tone: "progress",
      steps: [
        { label: "Pedido feito", when: "21 de set., 14:02", state: "done" },
        { label: "Pagamento aprovado", when: "21 de set., 14:05", state: "done" },
        { label: "Loja confirmou", when: "21 de set., 15:10", state: "done" },
        { label: "Em preparo", when: "22 de set., 10:30", state: "current" },
        { label: "Saiu para entrega", when: null, state: "todo" },
        { label: "Entregue", when: null, state: "todo" },
      ],
    },
    paid: { method: "Pagamento online: Cartão de crédito em 3x", status: { label: "Pagamento aprovado", tone: "done" } },
  },
}

/** A loja seguiu sem esperar o pagamento: a etapa dele continua por fazer, no meio das feitas. */
export const AceitoSemPagamento: Story = {
  args: {
    status: {
      headline: "Loja confirmou",
      detail: "Atualizado em 21 de set., 15:10",
      tone: "progress",
      steps: [
        { label: "Pedido feito", when: "21 de set., 14:02", state: "done" },
        { label: "Aguardando pagamento", when: null, state: "todo" },
        { label: "Loja confirmou", when: "21 de set., 15:10", state: "current" },
        { label: "Em preparo", when: null, state: "todo" },
        { label: "Saiu para entrega", when: null, state: "todo" },
        { label: "Entregue", when: null, state: "todo" },
      ],
    },
    paid: { method: "Pagamento online: Pix", status: { label: "Aguardando pagamento", tone: "wait" }, payHref: "#" },
  },
}

/** Uma retirada: sem "Saiu para entrega", sem linha de entrega no pagamento, e o endereço da loja. */
export const Retirada: Story = {
  args: {
    pickup: true,
    status: {
      headline: "Em preparo",
      detail: "Atualizado em 22 de set., 10:30",
      tone: "progress",
      steps: [
        { label: "Pedido feito", when: "21 de set., 14:02", state: "done" },
        { label: "Loja confirmou", when: "21 de set., 15:10", state: "done" },
        { label: "Em preparo", when: "22 de set., 10:30", state: "current" },
        { label: "Retirado na loja", when: null, state: "todo" },
      ],
    },
  },
}

/** Cancelado: quando e por quem, no lugar das etapas. */
export const Cancelado: Story = { args: { status: { headline: "Cancelado em 22 de set. de 2026", detail: "Cancelado pela loja", tone: "cancelled", steps: null } } }

/** O cashback do pedido no cartão de pagamento (BEELINK-243). */
export const ComCashback: Story = {
  args: { cashback: "Você vai ganhar R$ 11,86 de cashback quando o pedido for entregue." },
}

/** 6f: no celular a coluna vem antes do histórico e as etapas ficam em pé. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** O comprovante, para imprimir ou salvar em PDF. */
export const Comprovante: Story = {
  render: () => (
    <StorefrontOrderReceipt
      shop={{ name: "Loja do Design" }}
      number={1042}
      placedOn="21 de set. de 2026, 14:02"
      customer="Rafael Souza"
      handover={{ title: "Endereço de entrega", lines: ["Rafael Souza", "Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles — Fortaleza/CE — CEP 60160-230"] }}
      items={items}
      rows={[
        { label: "Subtotal", value: "R$ 249,70" },
        { label: "Entrega", value: "Grátis" },
        { label: "Promoção: Semana do Whey", value: "− R$ 7,49" },
        { label: "Cupom BEMVINDO5", value: "− R$ 4,99" },
      ]}
      total="R$ 237,22"
      method="Pagamento combinado com a loja: Pix"
      cashback="R$ 11,86 de cashback para usar até 30 de dez. de 2026."
      backHref="#"
    />
  ),
}

/** O comprovante de um pedido cobrado online diz se foi pago (BEELINK-207). */
export const ComprovantePago: Story = {
  render: () => (
    <StorefrontOrderReceipt
      shop={{ name: "Loja do Design" }}
      number={1042}
      placedOn="21 de set. de 2026, 14:02"
      customer="Rafael Souza"
      handover={{ title: "Retirada na loja", lines: ["Loja do Design"] }}
      items={items}
      rows={[{ label: "Subtotal", value: "R$ 249,70" }]}
      total="R$ 249,70"
      method="Pagamento online: Pix"
      status={{ label: "Pagamento aprovado" }}
      backHref="#"
    />
  ),
}
