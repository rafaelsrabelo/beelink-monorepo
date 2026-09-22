// App
import { SectionEditorScreen } from "@/components/sections/section-editor-screen"
import { getMessages } from "@/lib/locale"

export default async function EditBannerPage({ params }: PageProps<"/admin/[slug]/sections/[sectionId]">) {
  const { slug, sectionId } = await params
  const { ui } = await getMessages()

  return <SectionEditorScreen slug={slug} sectionId={sectionId} messages={ui} />
}
