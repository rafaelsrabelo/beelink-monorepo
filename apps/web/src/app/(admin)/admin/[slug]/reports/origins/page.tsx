// App
import { SalesByOriginScreen } from "@/components/reports/sales-by-origin-screen"
import { getMessages } from "@/lib/locale"
import { originExampleUrl } from "@/lib/report-period"
import { siteOrigin } from "@/lib/site-origin"

/**
 * The shop's sales by where their buyers came from (BEELINK-275). A page of its own until the sales
 * reports have one: it becomes a section of that page then, at this same address.
 */
export default async function SalesByOriginPage({ params }: PageProps<"/admin/[slug]/reports/origins">) {
  const [{ slug }, { ui, locale }, origin] = await Promise.all([params, getMessages(), siteOrigin()])

  return <SalesByOriginScreen slug={slug} locale={locale} exampleUrl={originExampleUrl(origin, slug)} messages={ui} />
}
