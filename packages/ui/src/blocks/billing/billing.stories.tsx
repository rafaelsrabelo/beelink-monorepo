// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { INVOICE_URL, exampleAccount, exampleOffers, offersWithOpenInvoice, paidByCard, paidByPix } from "./billing.fixtures"
import { SubscriptionAwaiting } from "./subscription-awaiting"
import { SubscriptionCheckout } from "./subscription-checkout"
import { SubscriptionConfirmed } from "./subscription-confirmed"
import { SubscriptionDue } from "./subscription-due"
import { SubscriptionPaid } from "./subscription-paid"
import { SubscriptionSkeleton } from "./subscription-skeleton"
import { SubscriptionStanding } from "./subscription-standing"

const noop = () => {}

const meta = {
  title: "Blocos/Painel/Assinatura",
  component: SubscriptionCheckout,
  decorators: [(Story) => <div className="flex max-w-4xl flex-col gap-6">{Story()}</div>],
  args: { offers: exampleOffers, account: null, loss: { kind: "trial", daysLeft: 5 }, locale: "pt-BR", onSubmit: noop },
} satisfies Meta<typeof SubscriptionCheckout>

export default meta
type Story = StoryObj<typeof meta>

/** Uma página em teste, numa conta que nunca deu os dados de cobrança: os três ciclos, os dois campos e o que saber antes. */
export const EmTesteSemDadosDeCobranca: Story = {}

/** A conta já deu os dados: diz em nome de quem é a cobrança, com o documento mascarado, e oferece alterar. */
export const ComDadosDeCobranca: Story = { args: { account: exampleAccount } }

/** O teste acabou: nada a perder, e o resto igual. */
export const TesteEncerrado: Story = { args: { account: exampleAccount, loss: null } }

/** Já há uma fatura em aberto do semestral: ele vem marcado e o botão continua o pagamento. */
export const FaturaEmAberto: Story = { args: { account: exampleAccount, offers: offersWithOpenInvoice, openInvoice: { cycle: "SEMIANNUAL", totalCents: 54000 } } }

/** Gerando a fatura: o botão e os ciclos travados. Pode levar alguns segundos. */
export const GerandoAFatura: Story = { args: { account: exampleAccount, pending: true } }

/** O Asaas não respondeu: a frase acima do botão. */
export const Recusada: Story = { args: { account: exampleAccount, error: "O Asaas não respondeu. Tente de novo: a fatura continua de onde parou." } }

/** Nada a comprar aqui: a frase no lugar do botão. */
export const Indisponivel: Story = { args: { account: exampleAccount, blocked: ptBR.subscription.unavailable } }

/** A tela inteira de uma página em teste: o topo e o formulário. */
export const TelaEmTeste: Story = {
  args: { account: exampleAccount },
  render: (args) => (
    <>
      <SubscriptionStanding plan="Beelink" standing={{ status: "TRIALING", lastDay: "22/10/2026", daysLeft: 5 }} />
      <SubscriptionCheckout {...args} />
    </>
  ),
}

/** Esperando a confirmação: o esqueleto onde ela vai aparecer, a mesma fatura e "Já paguei". */
export const AguardandoConfirmacao: Story = {
  render: () => <SubscriptionAwaiting invoiceUrl={INVOICE_URL} cycle="SEMIANNUAL" priceCents={54000} locale="pt-BR" onCheck={noop} onChoose={noop} />,
}

/** Uma verificação pedida à mão que ainda não achou o pagamento. */
export const AguardandoAindaNao: Story = {
  render: () => <SubscriptionAwaiting invoiceUrl={INVOICE_URL} cycle="MONTHLY" priceCents={10000} locale="pt-BR" onCheck={noop} onChoose={noop} notYet />,
}

/** O preço do plano mudou entre a tela e o clique: o valor da fatura vem dito antes de pagar. */
export const AguardandoComValorNovo: Story = {
  render: () => <SubscriptionAwaiting invoiceUrl={INVOICE_URL} cycle="MONTHLY" priceCents={11000} locale="pt-BR" onCheck={noop} onChoose={noop} priceChanged />,
}

/** O pagamento confirmado: a tela leva ao painel sozinha logo depois. */
export const PagamentoConfirmado: Story = { render: () => <SubscriptionConfirmed paidUntil="15/11/2026" panelHref="#" /> }

/** Em dia, paga com cartão: renova sozinha. */
export const EmDiaNoCartao: Story = {
  render: () => (
    <>
      <SubscriptionStanding plan="Beelink" standing={{ status: "ACTIVE", paidUntil: "15/10/2027" }} />
      <SubscriptionPaid view={paidByCard} locale="pt-BR" panelHref="#" />
    </>
  ),
}

/** Em dia, paga com Pix, e a fatura da renovação já saiu. */
export const EmDiaNoPixComRenovacao: Story = { render: () => <SubscriptionPaid view={paidByPix} locale="pt-BR" panelHref="#" /> }

/** A renovação venceu sem pagamento: o botão é a fatura devida. */
export const RenovacaoDevida: Story = {
  render: () => (
    <>
      <SubscriptionStanding plan="Beelink" standing={{ status: "PAST_DUE", endedOn: "15/11/2026" }} />
      <SubscriptionDue invoiceUrl={INVOICE_URL} onOpen={noop} onCheck={noop} />
    </>
  ),
}

/** A renovação venceu e o Asaas ainda não tem fatura dela: verificar de novo. */
export const RenovacaoDevidaSemFatura: Story = { render: () => <SubscriptionDue invoiceUrl={null} onOpen={noop} onCheck={noop} /> }

/** Carregando: o topo e o formulário nos seus lugares. */
export const Carregando: Story = { render: () => <SubscriptionSkeleton /> }
