// UI
import { AuthShell } from "@harness-monorepo/ui/blocks/auth/auth-shell"
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// App
import { AppLink } from "@/components/app-link"
import { brandFontStyle, jakarta } from "@/components/landing/brand-font"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { getMessages } from "@/lib/locale"

/**
 * The frame every signed-out screen shares: the landing's ground with Beelink's mark over the card,
 * which leads back to the landing. The card itself comes from the design system; under it,
 * bee-link's terms and privacy policy (BEELINK-171), on signing in as much as on signing up.
 *
 * The brand's typeface is loaded here for the mark's name alone; the forms stay in the panel's.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { locale, ui, web } = await getMessages()

  return (
    <div className={jakarta.variable} style={brandFontStyle}>
      <AuthShell linkComponent={AppLink} messages={ui}>
        {children}
        {/* foreground/80 like the card's own footer: muted text on the ground fails contrast in the dark theme (4.34:1). */}
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
      </AuthShell>
    </div>
  )
}
