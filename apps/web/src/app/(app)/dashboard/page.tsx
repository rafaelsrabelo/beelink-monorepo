// UI
import { ChartAreaInteractive } from "@harness-monorepo/ui/blocks/dashboard/chart-area-interactive"
import { SectionCards } from "@harness-monorepo/ui/blocks/dashboard/section-cards"

// App
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"
import { format } from "@/locales"
import { sampleChartData } from "./sample-data"

export default async function DashboardPage() {
  const user = await requireUser()
  const { ui, web } = await getMessages()

  return (
    <>
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-medium">{format(web.dashboard.welcome, { name: user.name })}</h2>
      </div>

      <SectionCards
        cards={[
          {
            label: web.dashboard.cardRevenue,
            value: "R$ 1.250,00",
            trend: "+12,5%",
            footnote: web.dashboard.cardRevenueFootnote,
          },
          {
            label: web.dashboard.cardNewAccounts,
            value: "1.234",
            trend: "-20%",
            footnote: web.dashboard.cardNewAccountsFootnote,
          },
          {
            label: web.dashboard.cardActiveAccounts,
            value: "45.678",
            trend: "+12,5%",
            footnote: web.dashboard.cardActiveAccountsFootnote,
          },
          {
            label: web.dashboard.cardGrowth,
            value: "4,5%",
            trend: "+4,5%",
            footnote: web.dashboard.cardGrowthFootnote,
          },
        ]}
      />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={sampleChartData} messages={ui} />
      </div>
    </>
  )
}
