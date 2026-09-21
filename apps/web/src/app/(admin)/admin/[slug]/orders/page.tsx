// App
import { getMessages } from "@/lib/locale"

/**
 * Orders, which the product does not have yet.
 *
 * A page and not a missing route: the menu names it, and a menu item that 404s is worse than one
 * that says plainly there is nothing here. It becomes the real screen when orders exist.
 */
export default async function OrdersPage() {
  const { web } = await getMessages()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-1 px-4 py-16 text-center lg:px-6">
      <h1 className="text-lg font-medium">{web.stores.soon.ordersTitle}</h1>
      <p className="text-muted-foreground text-sm">{web.stores.soon.ordersText}</p>
    </div>
  )
}
