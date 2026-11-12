"use client"

// React
import type { ReactNode } from "react"

// UI
import { AffiliateConfirmDialog } from "@harness-monorepo/ui/blocks/affiliates/affiliate-confirm-dialog"
import { AffiliateRecordHeader } from "@harness-monorepo/ui/blocks/affiliates/affiliate-record-header"
import { AffiliateRecordTabs } from "@harness-monorepo/ui/blocks/affiliates/affiliate-record-tabs"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import type { AffiliateRecordTab } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { AffiliateDocumentRecord } from "@/components/affiliates/affiliate-document-record"
import { AffiliateMoneySection } from "@/components/affiliates/affiliate-money-section"
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { affiliateDateFormatter, affiliateLinkOf, affiliateRecordViewOf } from "@/lib/affiliate-people"
import { recordTabHrefOf } from "@/lib/affiliate-record-tab"
import { useAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { useShopAffiliate } from "@/services/affiliates/shop-affiliate-hooks"
import { RecordCommissionTab } from "./record/record-commission-tab"
import { RecordGeneralTab } from "./record/record-general-tab"
import { RecordOrdersTab } from "./record/record-orders-tab"
import { useRecordActs } from "./record/use-record-acts"

export interface AffiliateRecordScreenProps {
  slug: string
  affiliateId: string
  /** The tab the address names (`?aba=`), Geral when none. */
  tab: AffiliateRecordTab
  /** This site's origin, which the affiliate's link is spelled with. */
  origin: string
  locale: string
  messages: UiMessages
}

/**
 * One affiliate, as the shop keeps them — in tabs since the user's review (12/11/2026): a header with
 * who they are and the acts their standing allows, and Geral, Comissão, Documento, Financeiro and
 * Pedidos, each an address of its own.
 */
export function AffiliateRecordScreen({ slug, affiliateId, tab, origin, locale, messages }: AffiliateRecordScreenProps) {
  const text = messages.affiliates
  const affiliate = useShopAffiliate(slug, affiliateId)
  const program = useAffiliateProgram(slug)
  const listHref = `/admin/${slug}/affiliates`
  const recordHref = `${listHref}/${affiliateId}`
  const acts = useRecordActs(slug, { id: affiliateId, name: affiliate.data?.name ?? "", email: affiliate.data?.email ?? "" }, listHref, messages)

  const frame = (children: ReactNode) => <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">{children}</div>
  if (affiliate.isPending || program.isPending) return frame(<AffiliatesSkeleton shape="list" />)
  if (affiliate.isError || program.isError) return frame(<AffiliatesFailed onRetry={() => void Promise.all([affiliate.refetch(), program.refetch()])} messages={messages} />)

  const current = affiliate.data
  const view = affiliateRecordViewOf(current, { text: text.record, date: affiliateDateFormatter(locale), link: affiliateLinkOf(origin, slug, current.slug) })

  const content: Record<AffiliateRecordTab, () => ReactNode> = {
    geral: () => <RecordGeneralTab slug={slug} affiliate={current} view={view} messages={messages} />,
    comissao: () => <RecordCommissionTab slug={slug} affiliate={current} tables={program.data.tables} locale={locale} messages={messages} />,
    documento: () => <AffiliateDocumentRecord slug={slug} affiliate={current} locale={locale} messages={messages} />,
    // Someone still invited has no books (IMPULSEIA-107).
    financeiro: () =>
      current.status === "INVITED" ? (
        <p className="text-muted-foreground text-sm">{text.record.moneyInvited}</p>
      ) : (
        <AffiliateMoneySection slug={slug} affiliateId={current.id} pixKey={current.pixKey} locale={locale} messages={messages} />
      ),
    pedidos: () => <RecordOrdersTab slug={slug} affiliateId={current.id} locale={locale} messages={messages} />,
  }

  return frame(
    <>
      <AffiliateRecordHeader
        name={current.name}
        email={current.email}
        status={current.status}
        link={view.link}
        photoUrl={current.photoUrl}
        backHref={listHref}
        onAction={acts.onAction}
        busy={acts.busy}
        notice={acts.notice}
        error={acts.errorCode ? affiliateErrorOf(acts.errorCode, text.errors) : undefined}
        linkComponent={AppLink}
        messages={messages}
      />
      <AffiliateRecordTabs active={tab} hrefOf={(next) => recordTabHrefOf(recordHref, next)} linkComponent={AppLink} messages={messages} />
      {content[tab]()}
      <AffiliateConfirmDialog text={acts.confirmText} keepLabel={text.record.keep} onConfirm={acts.confirm} onCancel={acts.keep} pending={acts.busy === "cancel" || acts.busy === "end"} />
    </>,
  )
}
