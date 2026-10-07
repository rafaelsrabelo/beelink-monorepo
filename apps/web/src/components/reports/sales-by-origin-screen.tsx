"use client"

// Next
import { useSearchParams } from "next/navigation"

// UI
import { ReportPeriodPicker } from "@harness-monorepo/ui/blocks/reports/report-period-picker"
import { SalesByOriginEmpty } from "@harness-monorepo/ui/blocks/reports/sales-by-origin-empty"
import { SalesByOriginNotes } from "@harness-monorepo/ui/blocks/reports/sales-by-origin-notes"
import { SalesByOriginSkeleton } from "@harness-monorepo/ui/blocks/reports/sales-by-origin-skeleton"
import { SalesByOriginTable } from "@harness-monorepo/ui/blocks/reports/sales-by-origin-table"
import { Button } from "@harness-monorepo/ui/components/button"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { Locale } from "@/locales"
import { AppLink } from "@/components/app-link"
import { REPORT_PERIODS, reportDayText, reportDaysOf, reportPeriodOf, salesByOriginHref } from "@/lib/report-period"
import { useSalesByOrigin } from "@/services/reports/report-hooks"

export interface SalesByOriginScreenProps {
  slug: string
  locale: Locale
  /** The shop's own address with campaign labels on it, built on the server from the site's public origin. */
  exampleUrl: string
  messages: UiMessages
}

/**
 * The shop's sales by where their buyers came from (BEELINK-275): a period, the table, and what is
 * good to know under it. Only what bee-link stored with each order — nothing here asks Meta, and
 * what the ads cost stays there.
 *
 * The period is the address's (`?period=`), so a view has a link and Back undoes a choice; the days
 * it means are worked out here, on the shop's clock, and the days said on the page are the ones the
 * API answered with.
 */
export function SalesByOriginScreen({ slug, locale, exampleUrl, messages }: SalesByOriginScreenProps) {
  const text = messages.reports.salesByOrigin
  const period = reportPeriodOf(useSearchParams())
  const report = useSalesByOrigin(slug, reportDaysOf(period, new Date()))

  const days = report.data ? { from: reportDayText(report.data.from, locale), to: reportDayText(report.data.to, locale) } : null
  const empty = report.data ? report.data.rows.length === 0 : false

  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ReportPeriodPicker current={period} options={REPORT_PERIODS.map((option) => ({ days: option, href: salesByOriginHref(slug, option) }))} linkComponent={AppLink} messages={messages} />
        {days ? <p className="text-muted-foreground text-sm tabular-nums">{format(text.periodRange, days)}</p> : null}
      </div>

      {report.isPending ? (
        <SalesByOriginSkeleton />
      ) : report.isError || !days ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="text-sm">{text.failed}</p>
          <Button type="button" variant="outline" onClick={() => void report.refetch()}>
            {text.retry}
          </Button>
        </div>
      ) : empty ? (
        <SalesByOriginEmpty exampleUrl={exampleUrl} messages={messages} />
      ) : (
        <SalesByOriginTable rows={report.data.rows} totals={report.data.totals} caption={format(text.caption, days)} locale={locale} messages={messages} />
      )}

      <SalesByOriginNotes {...(empty ? {} : { exampleUrl })} messages={messages} />
    </div>
  )
}
