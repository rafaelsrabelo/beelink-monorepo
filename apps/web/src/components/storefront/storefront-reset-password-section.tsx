// UI
import { StorefrontLinkSpent } from "@harness-monorepo/ui/blocks/storefront/storefront-link-spent"
import { StorefrontNewPassword } from "@harness-monorepo/ui/blocks/storefront/storefront-new-password"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { errorSentenceOf } from "@/lib/error-sentence"
import { BACK_KEY, paramOf, safeBackOf, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionPlace, SectionQuery } from "@/lib/storefront-section"

export interface StorefrontResetPasswordSectionProps {
  place: SectionPlace
  routes: StorefrontRoutes
  query: SectionQuery
  errors: WebMessages["errors"]
}

/**
 * The link in a shopper's new-password e-mail, at their shop (BEELINK-149): the new password, typed
 * twice. The token is only spent by the save — nothing checks a link without using it — so a used or
 * expired one is said when the save comes back refused, with the way to ask for another.
 */
export function StorefrontResetPasswordSection({ place, routes, query, errors }: StorefrontResetPasswordSectionProps) {
  const { store, messages: ui } = place
  const back = safeBackOf(store.slug, paramOf(query[BACK_KEY]))
  const token = paramOf(query.token)
  const code = paramOf(query.erro)

  return (
    <div className="py-4">
      {!token || code === "AUTH_TOKEN_INVALID" ? (
        <StorefrontLinkSpent kind="reset" askHref={routes.signIn({ mode: "senha", back })} linkComponent={AppLink} messages={ui} />
      ) : (
        <StorefrontNewPassword
          action={`/${store.slug}/api/customer/nova-senha`}
          // A refusal comes back to this very page, token and all; a save lands on the sign-in.
          hidden={{ token, [BACK_KEY]: back, retorno: routes.resetPassword({ token, back }), entrada: routes.signIn({ back }) }}
          error={code ? errorSentenceOf(errors, code) : null}
          messages={ui}
        />
      )}
    </div>
  )
}
