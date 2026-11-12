// Next
import { redirect } from "next/navigation"

// UI
import { StoreEmptyState } from "@harness-monorepo/ui/blocks/store/store-empty-state"

// App
import { AppLink } from "@/components/app-link"
import { affiliateShopCountOf, ownedShopCountOf } from "@/lib/account-reach"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"
import { format } from "@/locales"

/**
 * Where signing in lands, and the panel's Início for a shopkeeper who has no shop yet.
 *
 * It used to redirect straight to `/admin`, which with no shops redirected again to
 * `/create-store` — so a new account met a bare form three redirects after signing in, having
 * never seen the panel it had just been given. The shop owner asked for the opposite: sign in and
 * arrive at Início, with the menu, and create the shop from there because you chose to.
 *
 * It is still not an account-wide dashboard, and there should not be one: a shopkeeper with a shop
 * is always inside one, so this page hands them straight back to the doorway that picks it. What
 * lives here is only the state before any shop exists, which is the one moment that belongs to the
 * account rather than to a shop.
 */
export default async function HomePage() {
  const user = await requireUser()
  const shops = await ownedShopCountOf()

  // With a shop, the doorway decides: one walks through to it, several stop to be chosen between.
  if (shops > 0) redirect("/admin")
  // With none but shops it sells for (IMPULSEIA-108), the account's place is its own area.
  if ((await affiliateShopCountOf()) > 0) redirect("/afiliado")

  const { ui, web } = await getMessages()

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{format(web.dashboard.welcome, { name: user.name })}</h1>
      </div>
      <StoreEmptyState createHref="/create-store" linkComponent={AppLink} messages={ui} />
    </div>
  )
}
