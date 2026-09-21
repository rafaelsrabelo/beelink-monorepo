// App
import { StoreReadinessScreen } from "@/components/store/store-readiness-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"
import { format } from "@/locales"

/**
 * The panel's home, and the first page here that is a dashboard rather than a list.
 *
 * The list it replaced moved to /admin. A legacy link to /dashboard still resolves, to this,
 * which is a reasonable landing rather than a 404 — but it is no longer the shop list.
 */
export default async function DashboardPage() {
  const user = await requireUser()
  const { ui, web } = await getMessages()

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-medium">{format(web.dashboard.welcome, { name: user.name })}</h2>
        <p className="text-sm text-muted-foreground">{web.dashboard.readiness.title}</p>
      </div>
      <StoreReadinessScreen ui={ui} web={web} />
    </div>
  )
}
