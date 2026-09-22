// App
import { SectionScreen } from "@/components/sections/section-screen"
import { getMessages } from "@/lib/locale"

/** The shop's posters. It reads no shop of its own: the screen asks for what it needs by slug. */
export default async function BannersPage({ params }: PageProps<"/admin/[slug]/sections">) {
  const { slug } = await params
  const { ui } = await getMessages()

  return <SectionScreen slug={slug} messages={ui} />
}
