// Next
import { notFound, redirect } from "next/navigation"

// App
import { DesignScreen } from "@/components/design/design-screen"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { pagePreviewAt } from "@/lib/editor-data"
import { getMessages } from "@/lib/locale"
import { categoriesAt, shopAt } from "@/lib/storefront-data"

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
 *
 * Except for the page being edited, which is read through the owner's preview: what the canvas draws
 * is the draft, which the public read never serves. A landing is `?page=<id>`; an id that names no
 * landing of this shop — gone, another shop's, the home's own — opens the home instead of an error,
 * which is where the switcher would have gone anyway.
 */
export default async function DesignPage({ params, searchParams }: PageProps<"/admin/[slug]/design">) {
  const { slug } = await params
  const asked = (await searchParams).page
  const pageId = typeof asked === "string" && asked ? asked : null
  const [store, { ui, web }, preview] = await Promise.all([shopAt(slug), getMessages(), pagePreviewAt(slug, pageId ?? "home")])

  if (!store) notFound()
  if (pageId && preview?.page.kind !== "LANDING") redirect(`/admin/${slug}/design`)
  // The shop is there and its home's draft could not be read: an outage, not a page that is missing.
  if (!preview) throw new Error(`The draft of ${slug}'s home could not be read`)

  // The same call the shop window's home makes. The showcases' cards need none: they came resolved
  // inside `store`, so the preview's shelves are the ones the visitor gets.
  const categories = store.type === "INSTITUTIONAL" ? [] : await categoriesAt(slug)

  return (
    // The preview draws the shop in the shop's typeface, as the storefront's layout does; the
    // panel around it stays in its own.
    <div className={figtree.variable} style={shopFontStyle}>
      <DesignScreen
        // A page of its own: every draft, selection and panel starts over when the page changes.
        key={preview.page.id}
        store={store}
        categories={categories}
        page={preview}
        // From the server, never `new Date()` inside a component: the clock differs between the two
        // renders on the thirty-first of December and hydration says so out loud.
        year={new Date().getFullYear()}
        messages={ui}
        web={web}
      />
    </div>
  )
}
