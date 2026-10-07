"use client"

// UI
import { GoogleAnalyticsCard } from "@harness-monorepo/ui/blocks/integrations/google-analytics-card"
import { GoogleAnalyticsGuide } from "@harness-monorepo/ui/blocks/integrations/google-analytics-guide"
import { GoogleAnalyticsReports } from "@harness-monorepo/ui/blocks/integrations/google-analytics-reports"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { IntegrationsSkeleton } from "@harness-monorepo/ui/blocks/integrations/integrations-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { GOOGLE_ANALYTICS_HOME, googleAnalyticsCardOf, googleAnalyticsErrorOf } from "@/lib/google-analytics-form"
import { INTEGRATION_LOGOS, integrationPagesOf } from "@/lib/integration-pages"
import { useGoogleAnalyticsConnection, useRemoveGoogleAnalytics, useSaveGoogleAnalytics } from "@/services/integrations/google-analytics-hooks"
import { IntegrationError } from "@/services/integrations/integration-requests"

export interface GoogleAnalyticsScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * Google Analytics' own page among the Integrations (BEELINK-302): the shop's GA4 property, named by
 * the measurement ID its owner pastes, where that ID is found at Google, and where the reports are —
 * at Google, never here. The ID is saved and nothing more: this page loads nothing of Google's and
 * asks Google nothing, and what the shop window does with the ID is not this screen's to say.
 */
export function GoogleAnalyticsScreen({ slug, messages }: GoogleAnalyticsScreenProps) {
  const text = messages.integrations
  const back = { href: integrationPagesOf(slug).list, label: text.title }
  const connection = useGoogleAnalyticsConnection(slug)
  const save = useSaveGoogleAnalytics(slug)
  const remove = useRemoveGoogleAnalytics(slug)

  // Until the card is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.googleAnalytics.title}</h1>
  if (connection.isPending) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsSkeleton /></IntegrationFrame>
  if (connection.isError) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} /></IntegrationFrame>

  const view = googleAnalyticsCardOf(connection.data)
  // Said while the ID that was saved is the one in hand: an ID taken away since has nothing saved to speak of.
  const saved = save.isSuccess && view.measurementId !== null

  return (
    <IntegrationFrame back={back} result={saved ? { tone: "done", message: text.googleAnalytics.connectedNotice } : null}>
      <GoogleAnalyticsCard
        headingAs="h1"
        logoSrc={INTEGRATION_LOGOS.GOOGLE_ANALYTICS}
        view={view}
        onConnect={(measurementId) => {
          if (remove.isError) remove.reset()
          save.mutate({ measurementId })
        }}
        connecting={save.isPending}
        connectError={save.isError ? googleAnalyticsErrorOf(save.error instanceof IntegrationError ? save.error.errorCode : "UNKNOWN", text.googleAnalytics.errors) : undefined}
        onReplaceCancel={() => {
          if (save.isError) save.reset()
        }}
        onDisconnect={() => remove.mutate(undefined, { onSuccess: () => save.reset() })}
        disconnecting={remove.isPending}
        disconnectError={remove.isError ? text.googleAnalytics.disconnectFailed : undefined}
        messages={messages}
      />
      <GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} messages={messages} />
      <GoogleAnalyticsReports analyticsHref={GOOGLE_ANALYTICS_HOME} messages={messages} />
    </IntegrationFrame>
  )
}
