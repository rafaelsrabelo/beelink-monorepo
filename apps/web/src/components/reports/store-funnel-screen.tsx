"use client"

// Next
import { useSearchParams } from "next/navigation"

// UI
import { ReportPeriodPicker } from "@harness-monorepo/ui/blocks/reports/report-period-picker"
import { StoreFunnelEmpty } from "@harness-monorepo/ui/blocks/reports/store-funnel-empty"
import { StoreFunnelList } from "@harness-monorepo/ui/blocks/reports/store-funnel-list"
import { StoreFunnelNotes } from "@harness-monorepo/ui/blocks/reports/store-funnel-notes"
import { StoreFunnelRemarks } from "@harness-monorepo/ui/blocks/reports/store-funnel-remarks"
import { StoreFunnelSkeleton } from "@harness-monorepo/ui/blocks/reports/store-funnel-skeleton"
import { Button } from "@harness-monorepo/ui/components/button"
import { funnelIsEmpty } from "@harness-monorepo/ui/lib/funnel-view"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { Locale } from "@/locales"
import { AppLink } from "@/components/app-link"
import { REPORT_PERIODS, reportDayText, reportDaysOf, reportPeriodOf, storeFunnelHref } from "@/lib/report-period"
import { useStoreFunnel } from "@/services/reports/report-hooks"

/** For how long a day's counters are kept, said in the notes before the API has answered — and what it answers. */
const RETENTION_MONTHS = 13

export interface StoreFunnelScreenProps {
  slug: string
  locale: Locale
  messages: UiMessages
}

/**
 * The shop's funnel (BEELINK-276): a period, the five steps, what the period leaves out, and what
 * is good to know. Bee-link's own numbers — anonymous counts of what happened on the shop window,
 * and the shop's orders at the end — for every shop, with or without a pixel.
 *
 * The period is the address's (`?period=`), as on the other report. The first counted day is said
 * only when it falls inside the period: that is when part of what is on screen is missing.
 */
export function StoreFunnelScreen({ slug, locale, messages }: StoreFunnelScreenProps) {
  const text = messages.reports.funnel
  const period = reportPeriodOf(useSearchParams())
  const report = useStoreFunnel(slug, reportDaysOf(period, new Date()))
  const data = report.data
  const days = data ? { from: reportDayText(data.from, locale), to: reportDayText(data.to, locale) } : null
  const empty = data ? funnelIsEmpty(data.steps) : false
  const startedInside = data?.countingSince && data.countingSince > data.from ? reportDayText(data.countingSince, locale) : null

  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ReportPeriodPicker current={period} options={REPORT_PERIODS.map((option) => ({ days: option, href: storeFunnelHref(slug, option) }))} linkComponent={AppLink} messages={messages} />
        {days ? <p className="text-muted-foreground text-sm tabular-nums">{format(messages.reports.salesByOrigin.periodRange, days)}</p> : null}
      </div>
      {report.isPending ? (
        <StoreFunnelSkeleton />
      ) : report.isError || !data || !days ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="text-sm">{text.failed}</p>
          <Button type="button" variant="outline" onClick={() => void report.refetch()}>
            {text.retry}
          </Button>
        </div>
      ) : empty ? (
        <StoreFunnelEmpty messages={messages} />
      ) : (
        <>
          <StoreFunnelList steps={data.steps} caption={format(text.caption, days)} locale={locale} messages={messages} />
          <StoreFunnelRemarks panelSales={data.panelSales} countingSince={startedInside} locale={locale} messages={messages} />
        </>
      )}
      <StoreFunnelNotes retentionMonths={data?.retentionMonths ?? RETENTION_MONTHS} messages={messages} />
    </div>
  )
}
