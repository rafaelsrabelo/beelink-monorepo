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
import { LandingPosters } from "@harness-monorepo/ui/blocks/landing/landing-posters"
import { LandingShell } from "@harness-monorepo/ui/blocks/landing/landing-shell"
import { LandingSteps } from "@harness-monorepo/ui/blocks/landing/landing-steps"

// App
import { AppLink } from "@/components/app-link"
import { brandFontStyle, jakarta } from "@/components/landing/brand-font"
import { BRAND_PHOTOS } from "@/components/landing/landing-photos"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { getMessages } from "@/lib/locale"
import { serverEnv } from "@/lib/server-env"
import { siteOrigin } from "@/lib/site-origin"

/** The panel's own doors. A signed-in shopkeeper who follows either is sent on to the panel by the proxy. */
const LOGIN = "/login"
const SIGNUP = "/signup"

/**
 * The share image: Beelink's icon on the brand's yellow, 1200×630, centred so a square crop keeps it. The name carries a version
 * because WhatsApp keeps a preview by the image's address — a new picture under the old name is
 * never fetched again.
 */
const SHARE_IMAGE = { path: "/brand/share-v2.png", width: 1200, height: 630 }

/**
 * What a search result and a link preview say of the landing: its title, its description and the
 * logo. Every address is absolute — a preview is fetched from outside, and a relative `og:image`
 * is no image.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [{ web, ui, locale }, origin] = await Promise.all([getMessages(), siteOrigin()])
  const { title, description, shareImageAlt } = web.landing
  const image = { url: `${origin}${SHARE_IMAGE.path}`, width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, alt: shareImageAlt }

  return {
    title,
    description,
    alternates: { canonical: `${origin}/` },
    openGraph: { type: "website", url: `${origin}/`, siteName: ui.landing.brand, title, description, locale: locale.replace("-", "_"), images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
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
          <LandingCouriers photo={BRAND_PHOTOS.courier} termsHref={LEGAL_ROUTES.terms} privacyHref={LEGAL_ROUTES.privacy} linkComponent={AppLink} messages={ui} />
          <LandingFaq messages={ui} />
          <LandingPosters busStop={BRAND_PHOTOS.busStop} wall={BRAND_PHOTOS.wall} messages={ui} />
          <LandingCta signupHref={SIGNUP} linkComponent={AppLink} messages={ui} />
        </main>
        <LandingFooter termsHref={LEGAL_ROUTES.terms} privacyHref={LEGAL_ROUTES.privacy} year={new Date().getFullYear()} linkComponent={AppLink} messages={ui} />
      </LandingShell>
    </div>
  )
}
