// App
import { PromotionEditorScreen } from "@/components/promotions/promotion-editor-screen"
import { getMessages } from "@/lib/locale"

/** A promotion that does not exist yet, on a page of its own and not above the list. */
export default async function NewPromotionPage({ params }: PageProps<"/admin/[slug]/promotions/new">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <PromotionEditorScreen slug={slug} messages={ui} web={web} />
}
