// App
import { BannerScreen } from "@/components/banners/banner-screen"
import { getMessages } from "@/lib/locale"

/** The shop's posters. It reads no shop of its own: the screen asks for what it needs by slug. */
export default async function BannersPage({ params }: PageProps<"/admin/[slug]/banners">) {
  const { slug } = await params
  const { ui } = await getMessages()

  return <BannerScreen slug={slug} messages={ui} />
}
