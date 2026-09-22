// App
import { BannerEditorScreen } from "@/components/banners/banner-editor-screen"
import { getMessages } from "@/lib/locale"

/** A banner being written, at its own address — openable in a tab and returnable to. */
export default async function NewBannerPage({ params }: PageProps<"/admin/[slug]/banners/new">) {
  const { slug } = await params
  const { ui } = await getMessages()

  return <BannerEditorScreen slug={slug} messages={ui} />
}
