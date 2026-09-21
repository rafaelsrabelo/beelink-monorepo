// App
import { getMessages } from "@/lib/locale"

/** Customers, which arrive with orders. See the note on the orders page. */
export default async function CustomersPage() {
  const { web } = await getMessages()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-1 px-4 py-16 text-center lg:px-6">
      <h1 className="text-lg font-medium">{web.stores.soon.customersTitle}</h1>
      <p className="text-muted-foreground text-sm">{web.stores.soon.customersText}</p>
    </div>
  )
}
