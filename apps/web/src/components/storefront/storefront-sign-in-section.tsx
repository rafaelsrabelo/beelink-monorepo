// UI
import { StorefrontSignIn } from "@harness-monorepo/ui/blocks/storefront/storefront-sign-in"

// Types
import type { WebMessages } from "@/locales"

// App
import { signInOptionsAt } from "@/lib/storefront-data"
import { BACK_KEY, paramOf, safeBackOf, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionPlace, SectionQuery } from "@/lib/storefront-section"

export interface StorefrontSignInSectionProps {
  place: SectionPlace
  routes: StorefrontRoutes
  query: SectionQuery
  /** The sentences an `errorCode` becomes (apps/web AGENTS.md, rule 9). */
  errors: WebMessages["errors"]
}

/**
 * The shop's sign-in page, as the address asks for it: the face (`modo`), where to return
 * (`voltar`, kept inside the shop), and what the last post came back with (`erro`, `enviado`).
 * Everything is in the address because the form posts without a script and comes back by redirect.
 */
export async function StorefrontSignInSection({ place, routes, query, errors }: StorefrontSignInSectionProps) {
  const { store, signInMode: mode, messages: ui } = place
  const back = safeBackOf(store.slug, paramOf(query[BACK_KEY]))
  const code = paramOf(query.erro)
  // Only a code the web has a sentence for is shown; anything else a hand-typed address carries is
  // the catch-all, never an identifier on a shopper's screen.
  const error = code ? (errors[code as keyof WebMessages["errors"]] ?? errors.UNKNOWN) : null
  // Google only when the API has it set up; its link carries where to return and this page.
  const { google } = await signInOptionsAt()
  const googleHref = `/api/storefront/${store.slug}/customer/google?${new URLSearchParams({ [BACK_KEY]: back, retorno: routes.signIn() }).toString()}`

  return (
    <div className="py-4">
      <StorefrontSignIn
        mode={mode}
        action={`/${store.slug}/api/customer/${mode}`}
        hidden={{ [BACK_KEY]: back, retorno: routes.signIn() }}
        email={paramOf(query.email) ?? ""}
        error={error}
        sent={paramOf(query.enviado) === "1"}
        {...(google ? { google: { href: googleHref, iconSrc: "/brand/google.svg" } } : {})}
        hrefs={{
          signIn: routes.signIn({ back }),
          signUp: routes.signIn({ mode: "criar", back }),
          forgot: routes.signIn({ mode: "senha", back }),
        }}
        messages={ui}
      />
    </div>
  )
}
