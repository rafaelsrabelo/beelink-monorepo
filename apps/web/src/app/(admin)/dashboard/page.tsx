// App
import { StoreListScreen } from "@/components/store/store-list-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"
import { format } from "@/locales"

/** The shopkeeper's own shops. The legacy served this at /dashboard too, so links keep working. */
export default async function DashboardPage() {
  const user = await requireUser()
  const { ui, web } = await getMessages()

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-medium">{format(web.dashboard.welcome, { name: user.name })}</h2>
        <p className="text-sm text-muted-foreground">{web.stores.list.description}</p>
      </div>
      <StoreListScreen ui={ui} web={web} />
    </div>
  )
}
