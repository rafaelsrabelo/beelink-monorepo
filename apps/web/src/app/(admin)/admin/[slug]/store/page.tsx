// App
import { StoreSettingsScreen } from "@/components/store/store-settings-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"

/** Everything the panel edits about a shop, at the legacy panel's own address. */
export default async function StoreSettingsPage({ params }: PageProps<"/admin/[slug]/store">) {
  await requireUser()
  const { slug } = await params
  const { ui, web } = await getMessages()

  return (
    <div className="px-4 lg:px-6">
      <StoreSettingsScreen slug={slug} ui={ui} web={web} />
    </div>
  )
}
