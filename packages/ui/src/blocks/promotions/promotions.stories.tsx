import type { Meta, StoryObj } from "@storybook/react-vite"

import { DiscountFailed } from "./discount-failed"
import { DiscountFormSkeleton } from "./discount-form-skeleton"
import { DiscountListSkeleton } from "./discount-list-skeleton"
import { DiscountStatusTabs } from "./discount-status-tabs"
import { PromotionForm } from "./promotion-form"
import { PromotionList, type PromotionListRow } from "./promotion-list"
import { categoryOptions, promotionRows, promotionValues } from "./promotions.fixtures"

const tabs = (
  <DiscountStatusTabs
    tabs={[
      { key: "ALL", label: "Todas", count: 4, href: "#", active: true },
      { key: "ACTIVE", label: "Ativas", count: 2, href: "#", active: false },
      { key: "SCHEDULED", label: "Agendadas", count: 1, href: "#", active: false },
      { key: "PAUSED", label: "Pausadas", count: 1, href: "#", active: false },
      { key: "ENDED", label: "Encerradas", count: 0, href: "#", active: false },
    ]}
  />
)

/** The panel's list as the screen composes it: the status tabs over a card with the promotions. */
function PromotionsPanel({ rows }: { rows: readonly PromotionListRow[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {tabs}
      <div className="bg-card rounded-xl border">
        <PromotionList rows={rows} empty="none" onEdit={() => {}} onToggle={() => {}} />
      </div>
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Promoções",
  component: PromotionsPanel,
  args: { rows: promotionRows },
} satisfies Meta<typeof PromotionsPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Quatro promoções: duas ativas — uma delas só para a primeira compra —, uma agendada e uma pausada. */
export const Lista: Story = {}

/** A loja ainda não tem promoções. */
export const Vazia: Story = { args: { rows: [] } }

/** Carregando. */
export const Carregando: Story = { render: () => <DiscountListSkeleton /> }

/** A leitura falhou. */
export const Falhou: Story = { render: () => <DiscountFailed onRetry={() => {}} /> }

const form = { productQuery: "", onProductQueryChange: () => {}, productResults: [{ id: "w2", name: "Creatina 300g" }], categories: categoryOptions, onChange: () => {}, onSubmit: () => {}, onCancel: () => {} }

/** O formulário enquanto a promoção é lida, na página dela. */
export const FormularioCarregando: Story = { render: () => <div className="max-w-2xl"><DiscountFormSkeleton /></div> }

/** O formulário com produtos escolhidos. */
export const Formulario: Story = { render: () => <div className="max-w-2xl"><PromotionForm value={promotionValues} {...form} /></div> }

/** Em categorias, com valor fixo: a ajuda diz que o valor é por unidade. */
export const FormularioPorCategoria: Story = {
  render: () => (
    <div className="max-w-2xl">
      <PromotionForm value={{ ...promotionValues, scope: "CATEGORIES", kind: "FIXED", amount: "15,00", categoryIds: ["k1"] }} {...form} />
    </div>
  ),
}

/** Só na primeira compra: a ajuda sob a escolha diz o que conta como primeira compra. */
export const FormularioPrimeiraCompra: Story = {
  render: () => (
    <div className="max-w-2xl">
      <PromotionForm value={{ ...promotionValues, name: "Boas-vindas", scope: "CART", percent: "15", products: [], audience: "FIRST_PURCHASE" }} {...form} />
    </div>
  ),
}

/** Com campos a corrigir e a recusa da API. */
export const FormularioComErros: Story = {
  render: () => (
    <div className="max-w-2xl">
      <PromotionForm
        value={{ ...promotionValues, name: "", percent: "", products: [] }}
        {...form}
        issues={{ name: "Preencha este campo.", percent: "Informe um percentual entre 0,01 e 100.", products: "Escolha pelo menos um produto." }}
        error="Um produto escolhido não é mais desta loja."
      />
    </div>
  ),
}
