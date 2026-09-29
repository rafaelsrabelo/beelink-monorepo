// App
import { ConversationsScreen } from "@/components/conversations/conversations-screen"
import { getMessages } from "@/lib/locale"

/** The shop's conversations. A thin page over a client screen, like every other one in the panel. */
export default async function ConversationsPage({ params }: PageProps<"/admin/[slug]/conversations">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <ConversationsScreen slug={slug} locale={locale} messages={ui} />
}
