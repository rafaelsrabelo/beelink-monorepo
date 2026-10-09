"use client"

// UI
import { CustomDomainCard } from "@harness-monorepo/ui/blocks/custom-domain/custom-domain-card"
import { CustomDomainRecords } from "@harness-monorepo/ui/blocks/custom-domain/custom-domain-records"
import { CustomDomainSkeleton } from "@harness-monorepo/ui/blocks/custom-domain/custom-domain-skeleton"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { customDomainErrorOf, customDomainViewOf } from "@/lib/custom-domain-form"
import { useCheckCustomDomain, useCustomDomain, useRemoveCustomDomain, useSaveCustomDomain } from "@/services/custom-domain/custom-domain-hooks"
import { CustomDomainRequestError } from "@/services/custom-domain/custom-domain-requests"

export interface CustomDomainScreenProps {
  slug: string
  locale: string
  /** The shop's address at the platform, with no scheme: `beelink.biz/minha-loja`. */
  address: string
  /** The way back — the panel's home — and what it is called. */
  back: { href: string; label: string }
  messages: UiMessages
}

const codeOf = (error: unknown): string => (error instanceof CustomDomainRequestError ? error.errorCode : "UNKNOWN")

/**
 * The shop's own domain in the panel (BEELINK-285), on a page of its own: the domain is typed here,
 * what to create at the provider is under it, and where the domain stands is said as the API tells
 * it. Drawn in the frame an integration's page has — the way back, what just came of a save or a
 * removal, the card as the page's title.
 *
 * What the screen says is active may be a minute ahead of the shop window: the proxy reads which
 * host is which shop's once a minute, and nothing here can make it read sooner (BEELINK-283). The
 * card says so wherever a domain is active, and the removal says so before and after.
 */
export function CustomDomainScreen({ slug, locale, address, back, messages }: CustomDomainScreenProps) {
  const text = messages.customDomain
  const overview = useCustomDomain(slug)
  const save = useSaveCustomDomain(slug)
  const check = useCheckCustomDomain(slug)
  const remove = useRemoveCustomDomain(slug)

  // Until the card is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.title}</h1>
  if (overview.isPending) return <IntegrationFrame back={back} result={null}>{untitled}<CustomDomainSkeleton /></IntegrationFrame>
  if (overview.isError) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={() => void overview.refetch()} message={text.failed} messages={messages} /></IntegrationFrame>

  const { targetIps } = overview.data
  const domain = customDomainViewOf(overview.data, locale)
  // Each said while what it speaks of is what is in hand: a domain saved for "saved", none for "removed".
  const saved = save.isSuccess && domain !== null ? (domain.status === "ACTIVE" ? text.savedActiveNotice : text.savedPendingNotice) : null
  const removed = remove.isSuccess && domain === null ? format(text.removedNotice, { address }) : null
  const said = saved ?? removed
  // Asking for one of the three makes what the other two last said — a notice, a refusal, a check's
  // result — about a moment that has passed.
  const leaving = (...others: Array<{ reset: () => void }>) => others.forEach((other) => other.reset())

  return (
    <IntegrationFrame back={back} result={said ? { tone: "done", message: said } : null}>
      <CustomDomainCard
        headingAs="h1"
        targetIps={targetIps}
        domain={domain}
        address={address}
        onSave={(typed) => {
          leaving(check, remove)
          save.mutate({ domain: typed })
        }}
        saving={save.isPending}
        saveError={save.isError ? customDomainErrorOf(codeOf(save.error), text.errors, text.saveFailed) : undefined}
        onCheck={() => {
          leaving(save, remove)
          check.mutate()
        }}
        checking={check.isPending}
        checked={check.isSuccess}
        checkError={check.isError ? customDomainErrorOf(codeOf(check.error), text.errors, text.checkFailed) : undefined}
        onRemove={() => {
          leaving(save, check)
          remove.mutate()
        }}
        removing={remove.isPending}
        removeError={remove.isError ? text.removeFailed : undefined}
        messages={messages}
      />
      {targetIps ? <CustomDomainRecords targetIps={targetIps} messages={messages} /> : null}
    </IntegrationFrame>
  )
}
