// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { SubscriptionStrip } from "./subscription-strip"

const meta = {
  title: "Blocos/Painel/Faixa da assinatura",
  component: SubscriptionStrip,
  decorators: [(Story) => <div className="bg-shell-content p-6">{Story()}</div>],
  args: { view: { kind: "trial", daysLeft: 2, lastDay: "17/10/2026" }, subscribeHref: "/admin/loja-amora/subscribe" },
} satisfies Meta<typeof SubscriptionStrip>

export default meta
type Story = StoryObj<typeof meta>

/** O teste grátis termina daqui a dois dias: a faixa aparece nos dois últimos dias e no último. */
export const TesteEmDoisDias: Story = {}

/** O teste grátis termina amanhã. */
export const TesteAmanha: Story = { args: { view: { kind: "trial", daysLeft: 1, lastDay: "17/10/2026" } } }

/** O último dia do teste. */
export const TesteHoje: Story = { args: { view: { kind: "trial", daysLeft: 0, lastDay: "17/10/2026" } } }

/** O tempo grátis (de um cupom, ou o das páginas de 13/10) termina daqui a dois dias: a faixa do teste nunca aparece para ela. */
export const TempoGratisEmDoisDias: Story = { args: { view: { kind: "free", daysLeft: 2, lastDay: "13/11/2026" } } }

/** A renovação não foi paga e a página está na carência: o último dia para pagar e o aviso do boleto. */
export const Carencia: Story = { args: { view: { kind: "grace", payBy: "22/10/2026" } } }
