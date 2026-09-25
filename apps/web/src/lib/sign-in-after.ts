// App
import { shopAt } from "./storefront-data"
import { storefrontRoutes } from "./storefront-routes"

/** Where the person behind an e-mailed link signs in, and the shop whose door that is, if one. */
export interface SignInAfter {
  href: string
  slug: string | null
}

/**
 * A shopper's link names the shop their account belongs to (`voltar=/<slug>`, which the API writes
 * into it), and they sign in there; anyone else signs in at the panel's. The account is the shop's,
 * so the panel's own screens — its sign-in, its "resend the link" — would look for it in vain.
 */
export async function signInAfter(voltar: string | string[] | undefined): Promise<SignInAfter> {
  const slug = typeof voltar === "string" ? /^\/([a-z0-9-]+)$/.exec(voltar)?.[1] : undefined
  const shop = slug ? await shopAt(slug) : null

  return shop ? { href: storefrontRoutes(shop).signIn(), slug: shop.slug } : { href: "/login", slug: null }
}
