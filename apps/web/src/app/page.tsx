// Next
import type { Metadata } from "next"

// UI
import { LandingBanners } from "@harness-monorepo/ui/blocks/landing/landing-banners"
import { LandingCouriers } from "@harness-monorepo/ui/blocks/landing/landing-couriers"
import { LandingCta } from "@harness-monorepo/ui/blocks/landing/landing-cta"
import { LandingEcosystem } from "@harness-monorepo/ui/blocks/landing/landing-ecosystem"
import { LandingFaq } from "@harness-monorepo/ui/blocks/landing/landing-faq"
import { LandingFooter } from "@harness-monorepo/ui/blocks/landing/landing-footer"
import { LandingHeader } from "@harness-monorepo/ui/blocks/landing/landing-header"
import { LandingHero } from "@harness-monorepo/ui/blocks/landing/landing-hero"
import { LandingShell } from "@harness-monorepo/ui/blocks/landing/landing-shell"
import { LandingSteps } from "@harness-monorepo/ui/blocks/landing/landing-steps"

// App
import { AppLink } from "@/components/app-link"
import { brandFontStyle, jakarta } from "@/components/landing/brand-font"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { getMessages } from "@/lib/locale"
import { serverEnv } from "@/lib/server-env"

/** The panel's own doors. A signed-in shopkeeper who follows either is sent on to the panel by the proxy. */
const LOGIN = "/login"
const SIGNUP = "/signup"

export async function generateMetadata(): Promise<Metadata> {
  const { web } = await getMessages()
  return { title: web.landing.title, description: web.landing.description }
}

/**
 * Beelink's landing page (BEELINK-256): what the product is, to someone who has never seen it, and
 * the two ways in. "/" is outside the proxy matcher — bee-link serves a public site — so anyone
 * reaches it, signed in or not; it used to send everyone to the panel, and so to the sign-in.
 */
export default async function LandingPage() {
  const { ui } = await getMessages()
  const exampleHref = serverEnv.EXAMPLE_STORE_SLUG ? `/${serverEnv.EXAMPLE_STORE_SLUG}` : null

  return (
    <div className={jakarta.variable} style={brandFontStyle}>
      <LandingShell>
        <LandingHeader loginHref={LOGIN} signupHref={SIGNUP} termsHref={LEGAL_ROUTES.terms} privacyHref={LEGAL_ROUTES.privacy} linkComponent={AppLink} messages={ui} />
        <main>
          <LandingHero signupHref={SIGNUP} linkComponent={AppLink} messages={ui} />
          <LandingBanners signupHref={SIGNUP} exampleHref={exampleHref} linkComponent={AppLink} messages={ui} />
          <LandingEcosystem messages={ui} />
          <LandingSteps messages={ui} />
          <LandingCouriers termsHref={LEGAL_ROUTES.terms} privacyHref={LEGAL_ROUTES.privacy} linkComponent={AppLink} messages={ui} />
          <LandingFaq messages={ui} />
          <LandingCta signupHref={SIGNUP} linkComponent={AppLink} messages={ui} />
        </main>
        <LandingFooter termsHref={LEGAL_ROUTES.terms} privacyHref={LEGAL_ROUTES.privacy} year={new Date().getFullYear()} linkComponent={AppLink} messages={ui} />
      </LandingShell>
    </div>
  )
}
