// Next
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// App
import { StoreListScreen } from "@/components/store/store-list-screen"
import { getMessages } from "@/lib/locale"
import { callApi } from "@/lib/api"
import { ACCESS_COOKIE } from "@/lib/session-cookies"
import { requireUser } from "@/lib/session"
import { format } from "@/locales"

/**
 * Which shop you are about to work in.
 *
 * It is a doorway and not a room. There is no state in this panel where a shopkeeper is "in their
 * account, over all their shops": they sign in, pick a shop, and every screen from then on belongs
 * to that shop — which is why this page has no sidebar and why nothing links back to it except the
 * switcher's own "change shop".
 *
 * It walks through on its own whenever the choice is not a real one. Nobody wants to click past a
 * list of one, and a shopkeeper with one shop would meet this page on every single sign-in.
 */
async function shopsOf(accessToken: string) {
  const response = await callApi({ path: "/stores/mine", method: "GET", accessToken })

  if (!response.ok) return []

  return (await response.json()) as { slug: string; name: string }[]
}

export default async function WorkspacePickPage() {
  const user = await requireUser()
  const jar = await cookies()
  const accessToken = jar.get(ACCESS_COOKIE)?.value ?? ""

  const shops = await shopsOf(accessToken)

  // Nothing to choose between. A shop has to exist before any of this means anything.
  if (!shops.length) redirect("/create-store")

  /*
    One shop is not a choice, so that one walks through. Anything more stops here.

    It used to remember the last shop in a cookie and walk through that too, and that was me
    over-thinking it: the shop owner asked to CHOOSE on signing in, and a door that opens itself
    because of what you did yesterday is not a door you chose to walk through. The remembering is
    gone rather than switched off — a cookie nothing reads is a thing to explain later.
  */
  if (shops.length === 1) redirect(`/admin/${shops[0].slug}`)

  const { ui, web } = await getMessages()

  return (
    <section className="bg-card w-full max-w-xl rounded-2xl border p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{format(web.dashboard.welcome, { name: user.name })}</h1>
        <p className="text-muted-foreground text-sm">{web.stores.list.description}</p>
      </div>
      <StoreListScreen ui={ui} web={web} />
    </section>
  )
}
