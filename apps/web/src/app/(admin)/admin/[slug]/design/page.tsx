// Next
import { notFound } from "next/navigation"

// App
import { DesignScreen } from "@/components/design/design-screen"
import { getMessages } from "@/lib/locale"
import { homeAt, shopAt } from "@/lib/storefront-data"

/**
 * Design mode, and the reason this page reads the PUBLIC shop rather than the owner's.
 *
 * The preview has to be what a visitor is served, and the panel's own queries are not that: they
 * carry drafts, sold-out products, hidden categories and counts the window never shows. Rebuilding
 * that rule in the browser would be a second implementation of `ON_THE_SHELF_WHERE`, and a parent
 * category's rolled-up count cannot be reproduced from the owner's rows at all.
 *
 * So this page calls the same two functions the storefront calls. What appears on the left is, by
 * construction, the page the customer gets — and it costs no new endpoint and no duplicated rule.
 */
export default async function DesignPage({ params }: PageProps<"/admin/[slug]/design">) {
  const { slug } = await params
  const [store, { ui, web }] = await Promise.all([shopAt(slug), getMessages()])

  if (!store) notFound()

  // The same call the shop window's home makes, with the same argument — so the rails in the
  // preview are the rails the visitor gets, grouped the way the shopkeeper chose.
  const home = await homeAt(slug, store.showProductsByCategory)

  return (
    <DesignScreen
      store={store}
      categories={home.categories}
      bands={home.bands}
      // From the server, never `new Date()` inside a component: the clock differs between the two
      // renders on the thirty-first of December and hydration says so out loud.
      year={new Date().getFullYear()}
      messages={ui}
      web={web}
    />
  )
}
