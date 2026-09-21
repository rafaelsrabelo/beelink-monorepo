// Next
import { redirect } from "next/navigation"

/**
 * There is no shop overview, and there was never much of one: this route rendered a card of the
 * shop you had just clicked to get here, which is a page whose content is a link to itself.
 *
 * It stays as a redirect rather than disappearing, because it is the address every menu, bookmark
 * and e-mail built while it existed — and because `/admin/<slug>` is the natural thing to type.
 */
export default async function StorePage({ params }: PageProps<"/admin/[slug]">) {
  const { slug } = await params

  redirect(`/admin/${slug}/store`)
}
