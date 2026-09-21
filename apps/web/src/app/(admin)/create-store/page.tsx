// App
import { StoreCreateScreen } from "@/components/store/store-create-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"

/** The legacy wizard's address, kept: /create-store is what the app's own links already point at. */
export default async function CreateStorePage() {
  await requireUser()
  const { ui, web } = await getMessages()

  return (
    <div className="px-4 lg:px-6">
      <StoreCreateScreen ui={ui} web={web} />
    </div>
  )
}
