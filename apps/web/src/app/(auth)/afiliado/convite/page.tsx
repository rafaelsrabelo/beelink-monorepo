// Next
import type { Metadata } from "next"

// App
import { AffiliateInviteScreen } from "@/components/affiliates/invite/affiliate-invite-screen"
import { getMessages } from "@/lib/locale"
import { getCurrentUser } from "@/lib/session"
import { siteOrigin } from "@/lib/site-origin"

/** A link that was e-mailed to one person: never offered to a search engine. */
export async function generateMetadata(): Promise<Metadata> {
  const { ui } = await getMessages()
  return { title: ui.affiliateInvite.title, robots: { index: false, follow: false } }
}

/**
 * The invite to sell for a shop (IMPULSEIA-104), the page its e-mail links to. bee-link's own, not a
 * shop's — `afiliado` is a reserved slug — and public: who is signed in, if anyone, is read here and
 * handed to the screen, which picks the way in from it.
 */
export default async function AffiliateInvitePage({ searchParams }: PageProps<"/afiliado/convite">) {
  const [query, { ui, locale }, user, origin] = await Promise.all([searchParams, getMessages(), getCurrentUser(), siteOrigin()])
  const token = typeof query.token === "string" ? query.token : ""

  return <AffiliateInviteScreen token={token} signedInEmail={user?.email ?? null} origin={origin} locale={locale} messages={ui} />
}
