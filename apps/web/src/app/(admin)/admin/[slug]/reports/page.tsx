// UI
import { ReportsIndex } from "@harness-monorepo/ui/blocks/reports/reports-index"

// App
import { AppLink } from "@/components/app-link"
import { getMessages } from "@/lib/locale"
import { reportPagesOf, storeFunnelHref } from "@/lib/report-period"

/**
 * Where the menu's "Relatórios" lands: the shop's reports, listed (BEELINK-276). It led straight to
 * the one report while there was one; this is the page the sales reports grow from — theirs join
 * the list, and each report keeps the address it has.
 */
export default async function ReportsPage({ params }: PageProps<"/admin/[slug]/reports">) {
  const [{ slug }, { ui }] = await Promise.all([params, getMessages()])
  const text = ui.reports.index

  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>
      <ReportsIndex
        reports={[
          { ...text.origins, href: reportPagesOf(slug).origins },
          { ...text.funnel, href: storeFunnelHref(slug) },
        ]}
        linkComponent={AppLink}
        messages={ui}
      />
    </div>
  )
}
