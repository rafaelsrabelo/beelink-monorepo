// Next
import { redirect } from "next/navigation"

// App
import { reportPagesOf } from "@/lib/report-period"

/**
 * Where the menu's "Relatórios" lands. There is one report today (BEELINK-275), so this leads
 * straight to it; the page of sales reports takes this address when it exists, and the menu does
 * not change.
 */
export default async function ReportsPage({ params }: PageProps<"/admin/[slug]/reports">) {
  const { slug } = await params

  redirect(reportPagesOf(slug).origins as Parameters<typeof redirect>[0])
}
