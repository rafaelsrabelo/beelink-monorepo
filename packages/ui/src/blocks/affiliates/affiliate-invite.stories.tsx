import type { Meta, StoryObj } from "@storybook/react-vite"

import { AuthCard } from "../auth/auth-card"
import { AffiliateAcceptanceForm } from "./affiliate-acceptance-form"
import { acceptance, invitation } from "./affiliate-invite.fixtures"
import { AffiliateInviteDone } from "./affiliate-invite-done"
import { AffiliateInviteNotice } from "./affiliate-invite-notice"
import { AffiliateInviteSkeleton } from "./affiliate-invite-skeleton"
import { AffiliateInvitationSummary } from "./affiliate-invitation-summary"

const noop = () => {}

/** The invite as the page composes it: the card, what is on offer, the way in. */
function InviteScreen({ signUp = true }: { signUp?: boolean }) {
  return (
    <AuthCard title="Convite para vender" description="Lessari Suplementos convida você para vender pela loja e ganhar comissão." className="max-w-lg">
      <div className="flex flex-col gap-6">
        <AffiliateInvitationSummary invitation={invitation} />
        <AffiliateAcceptanceForm signUp={signUp} value={acceptance} onChange={noop} onSubmit={noop} slugHint={{ kind: "available", link: "beelink.com.br/lessari/joao" }} hasTerms />
      </div>
    </AuthCard>
  )
}

const meta = {
  title: "Blocos/Afiliados/Convite",
  component: InviteScreen,
} satisfies Meta<typeof InviteScreen>

export default meta
type Story = StoryObj<typeof meta>

/** Quem ainda não tem conta: cria a conta e aceita. */
export const CriarContaEAceitar: Story = {}

/** Quem já entrou com a conta do convite. */
export const Aceitar: Story = { args: { signUp: false } }

/** O nome escolhido não serve, e a loja mudou os termos no meio. */
export const Recusado: Story = {
  render: () => (
    <AuthCard title="Convite para vender" description="" className="max-w-lg">
      <AffiliateAcceptanceForm
        signUp={false}
        value={{ ...acceptance, slug: "produtos" }}
        onChange={noop}
        onSubmit={noop}
        slugHint={{ kind: "unavailable", message: "Esse nome é usado pela loja. Escolha outro." }}
        hasTerms
        notice="A loja mudou os termos enquanto você lia. Leia de novo antes de aceitar."
        issues={{ agreed: "Para aceitar, marque que concorda." }}
      />
    </AuthCard>
  ),
}

/** Lendo o convite. */
export const Carregando: Story = {
  render: () => (
    <AuthCard title="Convite para vender" description="" className="max-w-lg">
      <AffiliateInviteSkeleton />
    </AuthCard>
  ),
}

/** O convite venceu. */
export const Vencido: Story = {
  render: () => (
    <AuthCard title="Convite para vender" description="" className="max-w-lg">
      <AffiliateInviteNotice title="Convite vencido" body="Os 7 dias deste convite passaram. Peça à loja para enviá-lo de novo." />
    </AuthCard>
  ),
}

/** Aceito: o link para compartilhar. */
export const Pronto: Story = {
  render: () => (
    <AuthCard title="Pronto! Você vende pela Lessari Suplementos" description="" className="max-w-lg">
      <AffiliateInviteDone link="https://beelink.com.br/lessari/joao" onCopy={noop} />
    </AuthCard>
  ),
}
