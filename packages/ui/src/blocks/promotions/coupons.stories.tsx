import type { Meta, StoryObj } from "@storybook/react-vite"

import { CouponForm } from "./coupon-form"
import { CouponList, type CouponListRow } from "./coupon-list"
import { CouponRedemptions } from "./coupon-redemptions"
import { DiscountStatusTabs } from "./discount-status-tabs"
import { couponRows, couponValues, redemptionRows } from "./promotions.fixtures"

/** The panel's list as the screen composes it: the status tabs over a card with the coupons. */
function CouponsPanel({ rows }: { rows: readonly CouponListRow[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <DiscountStatusTabs
        tabs={[
          { key: "ALL", label: "Todos", count: 3, href: "#", active: true },
          { key: "ACTIVE", label: "Ativos", count: 1, href: "#", active: false },
          { key: "EXHAUSTED", label: "Esgotados", count: 1, href: "#", active: false },
        ]}
      />
      <div className="bg-card rounded-xl border">
        <CouponList rows={rows} empty="none" onEdit={() => {}} onToggle={() => {}} onUses={() => {}} />
      </div>
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Cupons",
  component: CouponsPanel,
  args: { rows: couponRows },
} satisfies Meta<typeof CouponsPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Três cupons: um ativo, que vale só na primeira compra, um pausado e um esgotado. */
export const Lista: Story = {}

/** A loja ainda não tem cupons. */
export const Vazia: Story = { args: { rows: [] } }

/** O formulário de um cupom percentual com mínimo e limites. */
export const Formulario: Story = { render: () => <div className="max-w-2xl"><CouponForm value={couponValues} onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} /></div> }

/** Frete grátis não tem valor para digitar. */
export const FormularioFreteGratis: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CouponForm value={{ ...couponValues, code: "FRETE-GRATIS", kind: "FREE_SHIPPING", percent: "" }} onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />
    </div>
  ),
}

/** Só na primeira compra: a ajuda sob a escolha diz o que conta como primeira compra. */
export const FormularioPrimeiraCompra: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CouponForm value={{ ...couponValues, audience: "FIRST_PURCHASE" }} onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />
    </div>
  ),
}

/** "Mostrar este cupom na loja" ligado: a vitrine e o carrinho dizem o código a quem pode usá-lo. */
export const FormularioMostradoNaLoja: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CouponForm value={{ ...couponValues, shownInStore: true }} onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />
    </div>
  ),
}

/** Os usos: um pedido cancelado fica na lista, marcado. */
export const Usos: Story = { render: () => <div className="max-w-2xl"><CouponRedemptions rows={redemptionRows} /></div> }

/** Os usos carregando. */
export const UsosCarregando: Story = { render: () => <div className="max-w-2xl"><CouponRedemptions rows={null} /></div> }
