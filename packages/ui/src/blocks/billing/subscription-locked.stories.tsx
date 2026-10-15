// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { exampleOffers } from "./billing.fixtures"
import { SubscriptionLocked } from "./subscription-locked"
import { SubscriptionLockedSkeleton } from "./subscription-locked-skeleton"

const SUBSCRIBE = "/admin/loja-amora/subscribe"

const meta = {
  title: "Blocos/Painel/Página travada",
  component: SubscriptionLocked,
  decorators: [(Story) => <div className="bg-shell-content flex flex-col gap-6 py-6">{Story()}</div>],
  args: {
    reason: "TRIAL_EXPIRED",
    endedOn: "13/10/2026",
    page: { name: "Loja Amora", logoUrl: null },
    shop: true,
    otherPages: false,
    plan: { name: "Beelink", offers: exampleOffers },
    subscribeHref: SUBSCRIBE,
    locale: "pt-BR",
  },
} satisfies Meta<typeof SubscriptionLocked>

export default meta
type Story = StoryObj<typeof meta>

/** O teste grátis acabou e a página nunca pagou: o dia em que acabou, o preço de cada período e o caminho para a tela Assinar. */
export const TesteEncerrado: Story = {}

/** O mês grátis (de um cupom, ou o das páginas de 13/10) acabou: a API trava como teste vencido, e a tela diz o mês. */
export const MesGratisAcabou: Story = { args: { reason: "FREE_PERIOD_OVER", endedOn: "13/11/2026" } }

/** A renovação não foi paga e a carência acabou: o botão paga a renovação, não escolhe outro plano. */
export const RenovacaoNaoPaga: Story = { args: { reason: "SUSPENDED", endedOn: "22/10/2026" } }

/** A assinatura foi cancelada e o período pago acabou. */
export const Cancelada: Story = { args: { reason: "CANCELED", endedOn: "12/11/2026" } }

/** Cancelada sem período pago para dizer: a frase sem data. */
export const CanceladaSemData: Story = { args: { reason: "CANCELED", endedOn: null } }

/** Um site, numa conta com outras páginas: nada de pedidos de clientes, e as outras páginas seguem. */
export const SiteComOutrasPaginas: Story = { args: { shop: false, otherPages: true } }

/** Os preços ainda chegando: o cartão do plano em esqueleto, o resto já escrito. */
export const PrecosChegando: Story = { args: { plan: null, planPending: true } }

/** Sem plano à venda no catálogo: o cartão fica com a renovação e o botão. */
export const SemPlanoAVenda: Story = { args: { plan: null } }

/** O motivo ainda chegando: a tela inteira em esqueleto. */
export const Esqueleto: Story = { render: () => <SubscriptionLockedSkeleton /> }
