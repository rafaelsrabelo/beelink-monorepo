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
import { BrandPhoto } from "@/components/landing/brand-photo"
import courierStreet from "@/assets/images/courier-street.jpg"
import courierSunny from "@/assets/images/courier-sunny.jpg"
import panelLaptop from "@/assets/images/panel-laptop.jpg"
import parcelPhoneTruck from "@/assets/images/parcel-phone-truck.jpg"
import posterBusStop from "@/assets/images/poster-bus-stop.jpg"
import posterWall from "@/assets/images/poster-wall.jpg"
import { LEGAL_ROUTES } from "@/lib/legal-routes"
import { getMessages } from "@/lib/locale"
import { serverEnv } from "@/lib/server-env"
import { siteOrigin } from "@/lib/site-origin"

/** The panel's own doors. A signed-in shopkeeper who follows either is sent on to the panel by the proxy. */
const LOGIN = "/login"
const SIGNUP = "/signup"

/**
 * A banner's photo in the "Soluções" row is drawn about 600px wide at every width: a phone's banner
 * is narrower, but taller than the photo is, and the photo is cut to cover it. The panel's banner is
 * the wide one from `xl`, its photo over 70% of it.
 */
const BANNER_SIZES = "600px"
const WIDE_BANNER_SIZES = `(min-width: 80rem) 860px, ${BANNER_SIZES}`

/** The posters, two to a row from `md`, inside the page's 1440px column. */
const POSTER_SIZES = "(min-width: 90rem) 620px, (min-width: 48rem) 45vw, 100vw"

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
          <LandingBanners
            signupHref={SIGNUP}
            exampleHref={exampleHref}
            photos={{
              store: <BrandPhoto image={parcelPhoneTruck} alt="" sizes={BANNER_SIZES} />,
              panel: <BrandPhoto image={panelLaptop} alt={ui.landing.banners.panel.alt} sizes={WIDE_BANNER_SIZES} />,
              shipping: <BrandPhoto image={courierSunny} alt="" sizes={BANNER_SIZES} />,
            }}
            linkComponent={AppLink}
            messages={ui}
          />
          <LandingEcosystem messages={ui} />
          <LandingSteps messages={ui} />
          <LandingCouriers
            photo={<BrandPhoto image={courierStreet} alt="" sizes="(min-width: 80rem) 820px, 100vw" />}
            termsHref={LEGAL_ROUTES.terms}
            privacyHref={LEGAL_ROUTES.privacy}
            linkComponent={AppLink}
            messages={ui}
          />
          <LandingFaq messages={ui} />
          <LandingPosters
            busStop={<BrandPhoto image={posterBusStop} alt={ui.landing.posters.busStopAlt} sizes={POSTER_SIZES} />}
            wall={<BrandPhoto image={posterWall} alt={ui.landing.posters.wallAlt} sizes={POSTER_SIZES} />}
            messages={ui}
          />
          <LandingCta signupHref={SIGNUP} linkComponent={AppLink} messages={ui} />
        </main>
        <LandingFooter termsHref={LEGAL_ROUTES.terms} privacyHref={LEGAL_ROUTES.privacy} year={new Date().getFullYear()} linkComponent={AppLink} messages={ui} />
      </LandingShell>
    </div>
  )
}
