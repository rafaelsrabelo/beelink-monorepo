// Next
import type { Metadata } from "next"

// App
import { AffiliateShopScreen } from "@/components/affiliate-area/affiliate-shop-screen"
import { getMessages } from "@/lib/locale"
import { siteOrigin } from "@/lib/site-origin"

export async function generateMetadata(): Promise<Metadata> {
  const { ui } = await getMessages()
  return { title: ui.affiliateArea.title, robots: { index: false, follow: false } }
}

/**
 * `/afiliado/<loja>` (IMPULSEIA-108): the affiliate's page at one shop, its section in `?aba=`. The
 * site's origin is read here, so the links the page offers to copy are whole addresses.
 */
export default async function AffiliateShopPage({ params, searchParams }: PageProps<"/afiliado/[loja]">) {
  const [{ loja }, query, { ui, locale }, origin] = await Promise.all([params, searchParams, getMessages(), siteOrigin()])
  const tab = typeof query.aba === "string" ? query.aba : "home"

  return <AffiliateShopScreen key={loja} slug={loja} tab={tab} origin={origin} locale={locale} messages={ui} />
}
