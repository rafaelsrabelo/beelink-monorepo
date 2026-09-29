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

function OrderPage({ status, pickup = false }: { status: StorefrontOrderStatusProps; pickup?: boolean }) {
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
              { label: "Desconto", value: "− R$ 12,48", positive: true },
            ]}
            total="R$ 237,22"
            method="Pagamento combinado com a loja: Pix"
          />
          {pickup ? (
            <StorefrontOrderAddress title="Retirada na loja" lines={["Loja do Design", "Rua B, 20 — Centro · Fortaleza · CE"]} />
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

/** 6f: no celular a coluna vem antes do histórico e as etapas ficam em pé. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** O comprovante, para imprimir ou salvar em PDF. */
export const Comprovante: Story = {
  render: () => (
    <StorefrontOrderReceipt
      shop={{ name: "Loja do Design", address: "Rua B, 20 — Centro · Fortaleza · CE" }}
      number={1042}
      placedOn="21 de set. de 2026, 14:02"
      customer="Rafael Souza"
      handover={{ title: "Endereço de entrega", lines: ["Rafael Souza", "Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles — Fortaleza/CE — CEP 60160-230"] }}
      items={items}
      rows={[
        { label: "Subtotal", value: "R$ 249,70" },
        { label: "Entrega", value: "Grátis" },
        { label: "Desconto", value: "− R$ 12,48" },
      ]}
      total="R$ 237,22"
      method="Pagamento combinado com a loja: Pix"
      backHref="#"
    />
  ),
}
