// App
import { SectionEditorScreen } from "@/components/sections/section-editor-screen"
import { getMessages } from "@/lib/locale"

/** A banner being written, at its own address — openable in a tab and returnable to. */
export default async function NewBannerPage({ params }: PageProps<"/admin/[slug]/sections/new">) {
  const { slug } = await params
  const { ui } = await getMessages()

  return <SectionEditorScreen slug={slug} messages={ui} />
}
