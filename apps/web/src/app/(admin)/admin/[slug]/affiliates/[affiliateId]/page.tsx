// App
import { AffiliateRecordScreen } from "@/components/affiliates/affiliate-record-screen"
import { RECORD_TAB_KEY, recordTabOf } from "@/lib/affiliate-record-tab"
import { getMessages } from "@/lib/locale"
import { siteOrigin } from "@/lib/site-origin"

/** One affiliate's record (IMPULSEIA-104), in tabs since 12/11/2026: `?aba=` names the open one. */
export default async function AffiliateRecordPage({ params, searchParams }: PageProps<"/admin/[slug]/affiliates/[affiliateId]">) {
  const [{ slug, affiliateId }, query, { ui, locale }, origin] = await Promise.all([params, searchParams, getMessages(), siteOrigin()])
  const asked = query[RECORD_TAB_KEY]

  return <AffiliateRecordScreen slug={slug} affiliateId={affiliateId} tab={recordTabOf(typeof asked === "string" ? asked : null)} origin={origin} locale={locale} messages={ui} />
}
