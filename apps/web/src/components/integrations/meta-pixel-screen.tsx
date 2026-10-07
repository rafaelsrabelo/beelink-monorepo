"use client"

// UI
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { IntegrationsSkeleton } from "@harness-monorepo/ui/blocks/integrations/integrations-skeleton"
import { MetaConversionsCard } from "@harness-monorepo/ui/blocks/integrations/meta-conversions-card"
import { MetaPixelCard } from "@harness-monorepo/ui/blocks/integrations/meta-pixel-card"
import { MetaPixelGuide } from "@harness-monorepo/ui/blocks/integrations/meta-pixel-guide"
import { MetaPixelReportLink } from "@harness-monorepo/ui/blocks/integrations/meta-pixel-report-link"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { INTEGRATION_LOGOS, integrationPagesOf } from "@/lib/integration-pages"
import { META_EVENTS_MANAGER, metaConversionsOf, metaPixelCardOf, metaPixelErrorOf, metaTestErrorOf, metaTestResultOf, metaTokenErrorOf } from "@/lib/meta-pixel-form"
import { reportPagesOf } from "@/lib/report-period"
import { IntegrationError } from "@/services/integrations/integration-requests"
import { useMetaPixelConnection, useRemoveMetaPixel, useRemoveMetaPixelToken, useSaveMetaPixel, useSaveMetaPixelToken, useSendMetaPixelTestEvent } from "@/services/integrations/meta-pixel-hooks"

export interface MetaPixelScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * The Meta Pixel's own page among the Integrations (BEELINK-270): the shop's pixel, named by the ID
 * its owner pastes, and where that ID is found at Meta. The ID is saved and nothing more: this page
 * loads nothing of Meta's and asks Meta nothing, and what the shop window does with the ID is not
 * this screen's to say.
 *
 * Under it, for a shop with an ID saved, the purchases told from the server (BEELINK-274): the
 * Conversions API token — pasted, sealed by the API and never read back — and the test event, the
 * one thing here that does ask Meta, through the API.
 *
 * Last, the way to the sales by origin (BEELINK-275): what the campaigns brought is read there, with
 * or without a pixel.
 */
export function MetaPixelScreen({ slug, messages }: MetaPixelScreenProps) {
  const text = messages.integrations
  const back = { href: integrationPagesOf(slug).list, label: text.title }
  const connection = useMetaPixelConnection(slug)
  const save = useSaveMetaPixel(slug)
  const remove = useRemoveMetaPixel(slug)
  const token = useSaveMetaPixelToken(slug)
  const removeToken = useRemoveMetaPixelToken(slug)
  const test = useSendMetaPixelTestEvent(slug)

  // Until the card is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.metaPixel.title}</h1>
  if (connection.isPending) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsSkeleton /></IntegrationFrame>
  if (connection.isError) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} /></IntegrationFrame>

  const view = metaPixelCardOf(connection.data)
  // Said while the ID that was saved is the one in hand: a pixel taken away since has nothing saved to speak of.
  const saved = save.isSuccess && view.pixelId !== null
  const conversions = metaConversionsOf(connection.data)
  const words = text.metaConversions
  // The latest of the two is the one said: a token saved after the ID speaks over it.
  const tokenSaved = token.savedCount > 0 && conversions.token === "SET" && !removeToken.isSuccess
  const notice = tokenSaved ? words.savedNotice : saved ? text.metaPixel.connectedNotice : null

  return (
    <IntegrationFrame back={back} result={notice ? { tone: "done", message: notice } : null}>
      <MetaPixelCard
        headingAs="h1"
        logoSrc={INTEGRATION_LOGOS.META_PIXEL}
        view={view}
        onConnect={(pixelId) => {
          if (remove.isError) remove.reset()
          save.mutate({ pixelId })
        }}
        connecting={save.isPending}
        connectError={save.isError ? metaPixelErrorOf(save.error instanceof IntegrationError ? save.error.errorCode : "UNKNOWN", text.metaPixel.errors) : undefined}
        onReplaceCancel={() => {
          if (save.isError) save.reset()
        }}
        onDisconnect={() => remove.mutate(undefined, { onSuccess: () => save.reset() })}
        disconnecting={remove.isPending}
        disconnectError={remove.isError ? text.metaPixel.disconnectFailed : undefined}
        messages={messages}
      />
      {view.pixelId !== null ? (
        <MetaConversionsCard
          // A token saved, or another pixel: the card starts over, its replacement closed and its last test forgotten.
          key={`${view.connectedAt}:${token.savedCount}`}
          view={conversions}
          eventsManagerHref={META_EVENTS_MANAGER}
          onSaveToken={(accessToken) => {
            removeToken.reset()
            test.reset()
            token.save(accessToken)
          }}
          savingToken={token.isPending}
          tokenError={token.refusal ? metaTokenErrorOf(token.refusal, words.errors) : undefined}
          onReplaceCancel={token.forget}
          onRemoveToken={() => {
            token.forget()
            test.reset()
            removeToken.mutate()
          }}
          removingToken={removeToken.isPending}
          removeError={removeToken.isError ? words.removeFailed : undefined}
          onTest={(testEventCode) => test.mutate({ testEventCode })}
          testing={test.isPending}
          testError={test.isError ? metaTestErrorOf(test.error instanceof IntegrationError ? test.error.errorCode : "UNKNOWN", words.test.errors) : undefined}
          testResult={test.isSuccess ? metaTestResultOf(test.data, words.test.outcomes) : null}
          messages={messages}
        />
      ) : null}
      <MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} messages={messages} />
      <MetaPixelReportLink href={reportPagesOf(slug).origins} linkComponent={AppLink} messages={messages} />
    </IntegrationFrame>
  )
}
