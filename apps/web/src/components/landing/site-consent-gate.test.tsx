// Node
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { LandingConsentLive } from "./landing-consent-live"
import { LandingConsentReopen } from "./landing-consent-reopen"
import { SiteConsentGate, type SiteConsentGateProps } from "./site-consent-gate"
import { useSiteConsent } from "./site-consent-provider"
import { SITE_CONSENT_COOKIE } from "@/lib/site-consent-cookie"

const ID = "G-TEST000000"

/** Stands in for what AA4 brings: something on the page that follows the answer. */
function Loader() {
  const choice = useSiteConsent((consent) => consent.choice)
  return <span data-testid="analytics">{choice === "granted" ? "carregado" : "parado"}</span>
}

/** The landing as the page builds it: the notice, the page and the footer's button, mounted whether or not the site asks. */
function renderLanding(measurementId: SiteConsentGateProps["measurementId"], choice: SiteConsentGateProps["choice"] = null) {
  return render(
    <SiteConsentGate measurementId={measurementId} choice={choice}>
      <LandingConsentLive privacyHref="/privacidade" text={ptBR.landing.consent} />
      <main>
        a landing
        <Loader />
      </main>
      <footer>
        <LandingConsentReopen label="Cookies" />
      </footer>
    </SiteConsentGate>,
  )
}

const notice = () => screen.queryByRole("region", { name: "Cookies de medição" })

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  document.cookie = `${SITE_CONSENT_COOKIE}=; Path=/; Max-Age=0`
})

/** BEELINK-319: the question is a deployment with a measurement ID's, and nobody else's. */
describe("SiteConsentGate", () => {
  it("asks where a measurement ID is configured, with the page drawn and usable behind the question", () => {
    renderLanding(ID)

    expect(notice()).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("a landing")
    expect(screen.getByRole("button", { name: "Cookies" })).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("draws no notice, no status line and no 'Cookies' with no measurement ID, and writes no cookie", () => {
    const { container } = renderLanding(undefined)

    expect(notice()).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByText("Cookies")).not.toBeInTheDocument()
    // The page and its footer, and nothing else: no empty wrapper where the two would have stood.
    expect(container.innerHTML).toBe('<main>a landing<span data-testid="analytics">parado</span></main><footer></footer>')
    expect(document.cookie).toBe("")
  })

  // Compose hands an unset variable over as "", which the environment reads as unset; a blank that got through asks nothing either.
  it("reads a blank ID as none", () => {
    renderLanding("")

    expect(notice()).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("asks nothing and loads nothing with no ID, even for a visitor carrying a yes from when there was one", () => {
    renderLanding(undefined, "granted")

    expect(notice()).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByTestId("analytics")).toHaveTextContent("parado")
  })

  it("does not ask again once the visitor answered, and keeps the way back in the footer", () => {
    renderLanding(ID, "denied")

    expect(notice()).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cookies" })).toBeInTheDocument()
  })

  it("writes the cookie only at a click, where there is an ID", async () => {
    const user = userEvent.setup()
    renderLanding(ID)
    expect(document.cookie).toBe("")

    await user.click(screen.getByRole("button", { name: "Recusar" }))
    expect(document.cookie).toBe(`${SITE_CONSENT_COOKIE}=denied`)
  })

  /**
   * The sign-in and the sign-up use the answer and never ask: `SiteMeasured` mounts the gate there,
   * without the notice (BEELINK-320). What keeps that true is where the notice is mounted, so that
   * is what is pinned: the landing's page and nowhere else. The answer itself has one more reader,
   * the component that measures.
   */
  it("has its notice and its footer button mounted by the landing's page alone", () => {
    const src = join(process.cwd(), "src")
    const sources = (readdirSync(src, { recursive: true }) as string[])
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .map((file) => ({ file: file.replaceAll("\\", "/"), text: readFileSync(join(src, file), "utf8") }))
    const importersOf = (name: string) => sources.filter(({ text }) => new RegExp(`from "[^"]*/${name}"`).test(text)).map(({ file }) => file)

    expect(importersOf("landing-consent-live")).toEqual(["app/page.tsx"])
    expect(importersOf("landing-consent-reopen")).toEqual(["app/page.tsx"])
    expect(importersOf("site-consent-provider").sort()).toEqual([
      "components/landing/landing-consent-live.tsx",
      "components/landing/landing-consent-reopen.tsx",
      "components/landing/site-consent-gate.tsx",
      "components/site-analytics/site-analytics.tsx",
    ])
    expect(importersOf("site-consent-gate")).toEqual(["components/site-analytics/site-measured.tsx"])
  })

  // BEELINK-320 loads it behind a yes, through one module: no screen, no page and no other file names Google's tag or its addresses.
  it("names Google's tag in one file alone, the module every call to it goes through", () => {
    const src = join(process.cwd(), "src")
    const naming = (readdirSync(src, { recursive: true }) as string[])
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .filter((file) => /googletagmanager|google-analytics\.com|gtag\(|dataLayer|ga-disable/.test(readFileSync(join(src, file), "utf8")))
      .map((file) => file.replaceAll("\\", "/"))

    expect(naming).toEqual(["lib/google-analytics.ts"])
  })
})
