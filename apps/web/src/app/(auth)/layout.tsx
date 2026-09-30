// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// App
import { AppLink } from "@/components/app-link"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { getMessages } from "@/lib/locale"

/**
 * The frame every signed-out screen shares. The card itself comes from the design system; under it,
 * bee-link's terms and privacy policy (BEELINK-171), on signing in as much as on signing up.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { locale, ui, web } = await getMessages()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      {children}
      {/* foreground/80 like the card's own footer: muted text on bg-muted fails contrast (4.34:1). */}
      <p className="text-center text-xs text-foreground/80">
        {withParts(ui.legal.links, {
          terms: (
            <AppLink href={LEGAL_ROUTES.terms} className="underline underline-offset-4">
              {ui.legal.terms}
            </AppLink>
          ),
          privacy: (
            <AppLink href={LEGAL_ROUTES.privacy} className="underline underline-offset-4">
              {ui.legal.privacy}
            </AppLink>
          ),
        })}
      </p>
      <LocaleSwitcher locale={locale} messages={web} />
    </div>
  )
}
