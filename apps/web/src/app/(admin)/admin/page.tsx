// App
import { StoreListScreen } from "@/components/store/store-list-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"
import { format } from "@/locales"

/**
 * The shopkeeper's own shops — "Minhas lojas".
 *
 * It sat at /dashboard, where the legacy served it, and moved when the panel gained a dashboard
 * that is actually a dashboard. `/admin` is the panel's own prefix and is already on
 * RESERVED_SLUGS, so it collides with no shop; a top-level `/lojas` would have had to be reserved
 * and would have been one more name a shopkeeper could not have.
 *
 * A legacy link to /dashboard still resolves — to the panel's home rather than to this list.
 */
export default async function StoreListPage() {
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
