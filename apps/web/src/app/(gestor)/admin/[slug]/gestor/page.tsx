// App
import { GestorBoardScreen } from "@/components/gestor/gestor-board-screen"
import { getMessages } from "@/lib/locale"

/** The manager's board: the shop's orders, new to done, with the bell. A thin page over a client screen. */
export default async function GestorPage({ params }: PageProps<"/admin/[slug]/gestor">) {
  const { slug } = await params
  const { ui, web, locale } = await getMessages()

  return <GestorBoardScreen slug={slug} locale={locale} messages={ui} web={web} />
}
