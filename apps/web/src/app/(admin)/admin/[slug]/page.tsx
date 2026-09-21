// App
import { StoreOverviewScreen } from "@/components/store/store-overview-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"

/** One shop's panel home, at the address the legacy panel already used. */
export default async function StoreOverviewPage({ params }: PageProps<"/admin/[slug]">) {
  await requireUser()
  const { slug } = await params
  const { ui, web } = await getMessages()

  return (
    <div className="px-4 lg:px-6">
      <StoreOverviewScreen slug={slug} ui={ui} web={web} />
    </div>
  )
}
