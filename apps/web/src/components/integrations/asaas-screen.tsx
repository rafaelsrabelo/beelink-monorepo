"use client"

// UI
import { AsaasApprovalNotice } from "@harness-monorepo/ui/blocks/integrations/asaas-approval-notice"
import { AsaasCard } from "@harness-monorepo/ui/blocks/integrations/asaas-card"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { IntegrationsSkeleton } from "@harness-monorepo/ui/blocks/integrations/integrations-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AsaasPayments } from "@/components/integrations/asaas-payments"
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { approvalCheckedAtOf, approvalRecheckErrorOf, asaasCardOf, asaasConnectErrorOf, asaasUnapprovedOf } from "@/lib/asaas-form"
import { INTEGRATION_LOGOS, integrationPagesOf } from "@/lib/integration-pages"
import { useAsaasConnection, useConnectAsaas, useDisconnectAsaas, useRecheckAsaasApproval } from "@/services/integrations/asaas-hooks"
import { IntegrationError } from "@/services/integrations/integration-requests"

export interface AsaasScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * Asaas's own page among the Integrations (BEELINK-203): the shop's account there — connected with
 * the API key its owner pastes — and, once connected, the ways the shop is paid. The key never
 * reaches this screen until it is sent: the card hands it over once, and `useConnectAsaas` keeps
 * nothing of it past the call.
 *
 * A connected account Asaas has not approved (BEELINK-278) is said first, over the card: nothing is
 * paid on the site until it is, and "verificar de novo" asks Asaas there and then. The ways of
 * paying stay below — the shop's choices are kept, and hold from the approval on.
 */
export function AsaasScreen({ slug, messages }: AsaasScreenProps) {
  const text = messages.integrations
  const back = { href: integrationPagesOf(slug).list, label: text.title }
  const connection = useAsaasConnection(slug)
  const asaas = useConnectAsaas(slug)
  const disconnect = useDisconnectAsaas(slug)
  const recheck = useRecheckAsaasApproval(slug)

  // Until the card is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.asaas.title}</h1>
  if (connection.isPending) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsSkeleton /></IntegrationFrame>
  if (connection.isError) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} /></IntegrationFrame>

  const unapproved = asaasUnapprovedOf(connection.data)
  // Asked again and found approved, there and then: said once, where connecting says its own.
  const approvedNow = recheck.isSuccess && recheck.data.status === "CONNECTED" && recheck.data.approval === "APPROVED"
  const result = approvedNow ? text.asaas.approval.approvedNotice : asaas.connected && !unapproved ? text.asaas.connectedNotice : null

  return (
    <IntegrationFrame back={back} result={result ? { tone: "done", message: result } : null}>
      {unapproved ? (
        <AsaasApprovalNotice
          approval={unapproved}
          checkedAt={approvalCheckedAtOf(connection.data.approvalCheckedAt)}
          onRecheck={() => recheck.mutate()}
          rechecking={recheck.isPending}
          unchanged={recheck.isSuccess}
          error={recheck.isError ? approvalRecheckErrorOf(recheck.error instanceof IntegrationError ? recheck.error.errorCode : "UNKNOWN", text.asaas.approval.recheckErrors) : undefined}
          messages={messages}
        />
      ) : null}
      <AsaasCard
        headingAs="h1"
        logoSrc={INTEGRATION_LOGOS.ASAAS}
        view={asaasCardOf(connection.data)}
        onConnect={(apiKey) => {
          if (disconnect.isError) disconnect.reset()
          // What was asked of the key being replaced says nothing of the one that takes its place.
          recheck.reset()
          asaas.connect(apiKey)
        }}
        connecting={asaas.isPending}
        connectError={asaas.refusal ? asaasConnectErrorOf(asaas.refusal, connection.data.environment, text.asaas) : undefined}
        onReplaceCancel={() => {
          if (asaas.refusal) asaas.forget()
        }}
        onDisconnect={() => disconnect.mutate(undefined, { onSuccess: asaas.forget })}
        disconnecting={disconnect.isPending}
        disconnectError={disconnect.isError ? text.asaas.disconnectFailed : undefined}
        messages={messages}
      />
      {connection.data.status === "CONNECTED" ? <AsaasPayments slug={slug} messages={messages} /> : null}
    </IntegrationFrame>
  )
}
