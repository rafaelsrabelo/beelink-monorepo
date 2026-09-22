// App
import { BannerEditorScreen } from "@/components/banners/banner-editor-screen"
import { getMessages } from "@/lib/locale"

export default async function EditBannerPage({ params }: PageProps<"/admin/[slug]/banners/[bannerId]">) {
  const { slug, bannerId } = await params
  const { ui } = await getMessages()

  return <BannerEditorScreen slug={slug} bannerId={bannerId} messages={ui} />
}
