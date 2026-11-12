// Libs
import { redirect } from "next/navigation"

/**
 * The menu's "Afiliados" (IMPULSEIA-102). It leads to the programme's settings until the list of
 * affiliates arrives (AF4) and takes this address.
 */
export default async function AffiliatesPage({ params }: PageProps<"/admin/[slug]/affiliates">) {
  const { slug } = await params

  redirect(`/admin/${slug}/affiliates/settings` as Parameters<typeof redirect>[0])
}
