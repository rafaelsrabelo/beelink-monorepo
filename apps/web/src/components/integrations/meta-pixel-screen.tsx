"use client"

// UI
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { IntegrationsSkeleton } from "@harness-monorepo/ui/blocks/integrations/integrations-skeleton"
import { MetaPixelCard } from "@harness-monorepo/ui/blocks/integrations/meta-pixel-card"
import { MetaPixelGuide } from "@harness-monorepo/ui/blocks/integrations/meta-pixel-guide"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { INTEGRATION_LOGOS, integrationPagesOf } from "@/lib/integration-pages"
import { META_EVENTS_MANAGER, metaPixelCardOf, metaPixelErrorOf } from "@/lib/meta-pixel-form"
import { IntegrationError } from "@/services/integrations/integration-requests"
import { useMetaPixelConnection, useRemoveMetaPixel, useSaveMetaPixel } from "@/services/integrations/meta-pixel-hooks"

export interface MetaPixelScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * The Meta Pixel's own page among the Integrations (BEELINK-270): the shop's pixel, named by the ID
 * its owner pastes, and where that ID is found at Meta. The ID is saved and nothing more: this page
 * loads nothing of Meta's and asks Meta nothing, and what the shop window does with the ID is not
 * this screen's to say.
 */
export function MetaPixelScreen({ slug, messages }: MetaPixelScreenProps) {
  const text = messages.integrations
  const back = { href: integrationPagesOf(slug).list, label: text.title }
  const connection = useMetaPixelConnection(slug)
  const save = useSaveMetaPixel(slug)
  const remove = useRemoveMetaPixel(slug)

  // Until the card is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.metaPixel.title}</h1>
  if (connection.isPending) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsSkeleton /></IntegrationFrame>
  if (connection.isError) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} /></IntegrationFrame>

  const view = metaPixelCardOf(connection.data)
  // Said while the ID that was saved is the one in hand: a pixel taken away since has nothing saved to speak of.
  const saved = save.isSuccess && view.pixelId !== null

  return (
    <IntegrationFrame back={back} result={saved ? { tone: "done", message: text.metaPixel.connectedNotice } : null}>
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
      <MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} messages={messages} />
    </IntegrationFrame>
  )
}
