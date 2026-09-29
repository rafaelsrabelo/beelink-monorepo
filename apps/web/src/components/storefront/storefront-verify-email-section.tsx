// Next
import { redirect } from "next/navigation"

// UI
import { StorefrontLinkSpent } from "@harness-monorepo/ui/blocks/storefront/storefront-link-spent"

// App
import { AppLink } from "@/components/app-link"
import { emailConfirmedBy } from "@/lib/account-links"
import { BACK_KEY, EMAIL_CONFIRMED_KEY, paramOf, safeBackOf, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionPlace, SectionQuery } from "@/lib/storefront-section"

export interface StorefrontVerifyEmailSectionProps {
  place: SectionPlace
  routes: StorefrontRoutes
  query: SectionQuery
}

/**
 * The link in a shopper's confirmation e-mail, at their shop (BEELINK-149). The token is spent here,
 * on the server, on the request the click made: a second render in the browser would find it gone.
 * Confirmed, the shopper goes straight to the shop's sign-in, told so, on their way back to where
 * they were going; a used or expired link offers another from here.
 */
export async function StorefrontVerifyEmailSection({ place, routes, query }: StorefrontVerifyEmailSectionProps) {
  const { store, messages: ui } = place
  const back = safeBackOf(store.slug, paramOf(query[BACK_KEY]))
  const token = paramOf(query.token)

  if (token && (await emailConfirmedBy(token))) {
    const signIn = new URL(routes.signIn({ back }), "http://shop.invalid")
    signIn.searchParams.set(EMAIL_CONFIRMED_KEY, "1")
    redirect(`${signIn.pathname}${signIn.search}` as Parameters<typeof redirect>[0])
  }

  return (
    <div className="py-4">
      <StorefrontLinkSpent
        kind="confirm"
        action={`/${store.slug}/api/customer/reenviar`}
        hidden={{ [BACK_KEY]: back, retorno: routes.signIn() }}
        signInHref={routes.signIn({ back })}
        linkComponent={AppLink}
        messages={ui}
      />
    </div>
  )
}
