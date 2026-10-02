// App
import { CashbackScreen } from "@/components/cashback/cashback-screen"
import { getMessages } from "@/lib/locale"

/** The shop's cashback (BEELINK-242). A thin page over a client screen, like every other one in the panel. */
export default async function CashbackPage({ params }: PageProps<"/admin/[slug]/cashback">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <CashbackScreen slug={slug} locale={locale} messages={ui} />
}
