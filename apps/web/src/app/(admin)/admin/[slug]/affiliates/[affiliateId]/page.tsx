// App
import { AffiliateRecordScreen } from "@/components/affiliates/affiliate-record-screen"
import { getMessages } from "@/lib/locale"
import { siteOrigin } from "@/lib/site-origin"

/** One affiliate's record (IMPULSEIA-104). */
export default async function AffiliateRecordPage({ params }: PageProps<"/admin/[slug]/affiliates/[affiliateId]">) {
  const [{ slug, affiliateId }, { ui, locale }, origin] = await Promise.all([params, getMessages(), siteOrigin()])

  return <AffiliateRecordScreen slug={slug} affiliateId={affiliateId} origin={origin} locale={locale} messages={ui} />
}
