// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// App
import { AppLink } from "@/components/app-link"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { getMessages } from "@/lib/locale"

/**
 * The frame of bee-link's legal pages (BEELINK-171): public, read by anyone — a shopper sent from a
 * shop's footer, a shopkeeper from the sign-up — and belonging to no shop, so none of a shop's chrome.
 */
export default async function LegalLayout({ children }: LayoutProps<"/">) {
  const { ui, web } = await getMessages()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="font-semibold">{web.metadata.title}</span>
          <nav aria-label={ui.legal.footerTitle} className="text-sm text-muted-foreground">
            {withParts(ui.legal.links, {
              terms: (
                <AppLink href={LEGAL_ROUTES.terms} className="underline-offset-4 hover:underline">
                  {ui.legal.terms}
                </AppLink>
              ),
              privacy: (
                <AppLink href={LEGAL_ROUTES.privacy} className="underline-offset-4 hover:underline">
                  {ui.legal.privacy}
                </AppLink>
              ),
            })}
          </nav>
        </div>
      </header>
      <main className="px-6 py-10">{children}</main>
    </div>
  )
}
