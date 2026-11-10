// App
import { GestorConversationsScreen } from "@/components/gestor/gestor-conversations-screen"
import { getMessages } from "@/lib/locale"

/** The manager's conversations, each opening its order on the board. */
export default async function GestorConversationsPage({ params }: PageProps<"/admin/[slug]/gestor/conversas">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <GestorConversationsScreen slug={slug} locale={locale} messages={ui} />
}
