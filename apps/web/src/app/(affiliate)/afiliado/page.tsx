// Next
import type { Metadata } from "next"

// App
import { AffiliateShopsScreen } from "@/components/affiliate-area/affiliate-shops-screen"
import { getMessages } from "@/lib/locale"

/** A signed-in page of one person's: never offered to a search engine. */
export async function generateMetadata(): Promise<Metadata> {
  const { ui } = await getMessages()
  return { title: ui.affiliateArea.title, robots: { index: false, follow: false } }
}

/** `/afiliado` (IMPULSEIA-108): the shops the account sells for. The sale and payout e-mails lead here. */
export default async function AffiliateShopsPage() {
  const { ui, locale } = await getMessages()
  return <AffiliateShopsScreen locale={locale} messages={ui} />
}
