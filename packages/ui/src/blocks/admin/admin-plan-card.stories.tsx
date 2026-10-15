// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { SubscriptionCardStanding } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { en } from "../../locales/en"

// Block
import { AdminPlanCard } from "./admin-plan-card"

const view = (standing: SubscriptionCardStanding, urgent = false) => ({ plan: "Beelink", standing, urgent })

const meta = {
  title: "Blocos/Admin/Card do plano",
  component: AdminPlanCard,
  parameters: { layout: "fullscreen" },
  args: { view: view({ status: "TRIALING", daysLeft: 4 }), href: "/admin/lessari/subscribe" },
  // The rail's own width and ground: the card is drawn for 240px, and for 56px collapsed.
  decorators: [
    (Story, { args }) => (
      <div className={args.collapsed ? "bg-shell w-sidebar-icon px-1.5 py-3" : "bg-shell w-sidebar px-2 py-3"}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminPlanCard>

export default meta
type Story = StoryObj<typeof meta>

/** Em teste, com dias de sobra: o card é neutro, como o resto do menu. */
export const EmTeste: Story = {}

/** Os 2 últimos dias do teste: o aviso mais forte, nas cores de aviso (só onde a página pode travar). */
export const TesteEmDoisDias: Story = { args: { view: view({ status: "TRIALING", daysLeft: 2 }, true) } }

export const TesteTerminaAmanha: Story = { args: { view: view({ status: "TRIALING", daysLeft: 1 }, true) } }

export const TesteTerminaHoje: Story = { args: { view: view({ status: "TRIALING", daysLeft: 0 }, true) } }

/** No tempo grátis — o mês do cupom, ou o das páginas de 13/10 —, dito antes da situação. */
export const GratisAte: Story = { args: { view: view({ status: "FREE", lastDay: "13/11/2026", daysLeft: 29 }) } }

/** O tempo grátis também tem últimos dias. */
export const GratisAteAmanha: Story = { args: { view: view({ status: "FREE", lastDay: "13/11/2026", daysLeft: 1 }, true) } }

/** Paga: o dia da renovação, que é o último dia pago. */
export const Paga: Story = { args: { view: view({ status: "ACTIVE", renewsOn: "12/11/2026" }) } }

/** A renovação não foi paga e a página está na carência. */
export const PagamentoEmAtraso: Story = { args: { view: view({ status: "PAST_DUE" }, true) } }

/** Cancelada, ainda com o período pago: neutro, porque quem cancelou sabe. */
export const CanceladaComAcesso: Story = { args: { view: view({ status: "CANCELED", until: "12/11/2026" }) } }

/** Travada, por qualquer motivo: o card leva à tela Assinar, onde ela volta. */
export const PaginaTravada: Story = { args: { view: view({ status: "LOCKED" }, true) } }

/** Sem o nome do plano (o catálogo não respondeu): o card fala da assinatura da página. */
export const SemNomeDoPlano: Story = { args: { view: { plan: null, standing: { status: "TRIALING", daysLeft: 4 }, urgent: false } } }

/** Na própria tela Assinar: é a página atual, como um item do menu. */
export const NaTelaAssinar: Story = { args: { current: true } }

/** Enquanto a página é lida, com a cobrança sabidamente ligada: a forma do card, no lugar dele. */
export const Carregando: Story = { args: { view: null } }

/**
 * Recolhido: só o ícone, e só a partir de `lg`. O nome continua na árvore de acessibilidade e volta
 * como tooltip; neutro, o card é um item a mais do menu.
 */
export const Recolhido: Story = { args: { collapsed: true } }

/** Recolhido com aviso: o quadrado na cor de aviso continua, com o cadeado. */
export const RecolhidoTravada: Story = { args: { collapsed: true, view: view({ status: "LOCKED" }, true) } }

export const RecolhidoCarregando: Story = { args: { collapsed: true, view: null } }

export const EmIngles: Story = { args: { messages: en, view: view({ status: "TRIALING", daysLeft: 0 }, true) } }
