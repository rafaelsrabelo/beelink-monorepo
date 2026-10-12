// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { LandingConsentLive } from "./landing-consent-live"
import { LandingConsentReopen } from "./landing-consent-reopen"
import { SiteConsentProvider, useSiteConsent } from "./site-consent-provider"
import { CONSENT_COOKIE } from "@/lib/consent-cookie"
import { decodeSiteConsent, SITE_CONSENT_COOKIE, type SiteConsentChoice } from "@/lib/site-consent-cookie"

function cookieNow(name: string = SITE_CONSENT_COOKIE): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

/** Stands in for what AA4 brings: something on the page that follows the answer. */
function Loader() {
  const choice = useSiteConsent((consent) => consent.choice)
  return <span data-testid="analytics">{choice === "granted" ? "carregado" : "parado"}</span>
}

/** The landing as its page builds it: the notice first in the document, the page and its footer below. */
function renderLanding(choice: SiteConsentChoice | null, text = ptBR.landing.consent) {
  return render(
    <SiteConsentProvider choice={choice}>
      <LandingConsentLive privacyHref="/privacidade" text={text} />
      <a href="#planos">Planos</a>
      <Loader />
      <footer>
        <LandingConsentReopen label={text.footerLink} />
      </footer>
    </SiteConsentProvider>,
  )
}

const notice = () => screen.queryByRole("region", { name: "Cookies de medição" })

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  document.cookie = `${SITE_CONSENT_COOKIE}=; Path=/; Max-Age=0`
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`
})

/** BEELINK-319 */
describe("the landing's cookie notice, live", () => {
  it("asks a visitor who has not answered, with nothing loaded and no cookie written", () => {
    renderLanding(null)

    expect(notice()).toBeInTheDocument()
    expect(screen.getByTestId("analytics")).toHaveTextContent("parado")
    expect(cookieNow()).toBeUndefined()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("keeps a yes, leaves the page, says so aloud — and the page learns of it with no reload", async () => {
    const user = userEvent.setup()
    renderLanding(null)

    await user.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(notice()).not.toBeInTheDocument()
    expect(decodeSiteConsent(cookieNow())).toBe("granted")
    expect(screen.getByTestId("analytics")).toHaveTextContent("carregado")
    expect(screen.getByRole("status")).toHaveTextContent("Escolha salva: você aceitou os cookies de medição da Beelink.")
  })

  it("keeps a refusal as easily, and nothing is loaded", async () => {
    const user = userEvent.setup()
    renderLanding(null)

    await user.click(screen.getByRole("button", { name: "Recusar" }))

    expect(notice()).not.toBeInTheDocument()
    expect(decodeSiteConsent(cookieNow())).toBe("denied")
    expect(screen.getByTestId("analytics")).toHaveTextContent("parado")
    expect(screen.getByRole("status")).toHaveTextContent("Escolha salva: você recusou os cookies de medição da Beelink.")
  })

  it("does not ask again a visitor whose answer the server read from the cookie", () => {
    renderLanding("denied")

    expect(notice()).not.toBeInTheDocument()
    // Read from the cookie, it is not news: nothing is announced on every visit.
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("opens again from the footer, with the focus and the answer in force — and a yes can be taken back", async () => {
    const user = userEvent.setup()
    renderLanding("granted")
    expect(screen.getByTestId("analytics")).toHaveTextContent("carregado")

    await user.click(screen.getByRole("button", { name: "Cookies" }))

    const reopened = notice()!
    expect(reopened).toHaveFocus()
    expect(within(reopened).getByText("Sua escolha atual: você aceitou.")).toBeInTheDocument()
    // Opening the notice again says nothing was saved: nothing was, yet.
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    await user.click(within(reopened).getByRole("button", { name: "Recusar" }))

    expect(notice()).not.toBeInTheDocument()
    expect(decodeSiteConsent(cookieNow())).toBe("denied")
    expect(screen.getByTestId("analytics")).toHaveTextContent("parado")
    // The notice left with the click; the focus goes back to where the visitor asked from.
    expect(screen.getByRole("button", { name: "Cookies" })).toHaveFocus()
  })

  it("is opened and answered by the keyboard alone, from the footer and back to it", async () => {
    const user = userEvent.setup()
    renderLanding("denied")

    screen.getByRole("button", { name: "Cookies" }).focus()
    await user.keyboard("{Enter}")
    expect(notice()).toHaveFocus()

    // From the region: its link, a no, a yes.
    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole("button", { name: "Aceitar" })).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(decodeSiteConsent(cookieNow())).toBe("granted")
    expect(screen.getByRole("status")).toHaveTextContent("Escolha salva: você aceitou os cookies de medição da Beelink.")
    expect(screen.getByRole("button", { name: "Cookies" })).toHaveFocus()
  })

  it("takes the focus from the footer even while the first question is still on the page", async () => {
    const user = userEvent.setup()
    renderLanding(null)

    await user.click(screen.getByRole("button", { name: "Cookies" }))

    expect(notice()).toHaveFocus()
    expect(screen.queryByText(/Sua escolha atual/)).not.toBeInTheDocument()
  })

  it("never holds the focus: a keyboard walks through the notice and on to the page", async () => {
    const user = userEvent.setup()
    renderLanding(null)

    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole("button", { name: "Aceitar" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("link", { name: "Planos" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Cookies" })).toHaveFocus()
  })

  // The browser may hold a shop's answer on `/` too — at a shop's own domain that is where it is written.
  it("leaves a shop's answer as it found it, and is not answered by it", async () => {
    const user = userEvent.setup()
    document.cookie = `${CONSENT_COOKIE}=granted; Path=/`
    renderLanding(null)

    expect(notice()).toBeInTheDocument()
    expect(screen.getByTestId("analytics")).toHaveTextContent("parado")

    await user.click(screen.getByRole("button", { name: "Recusar" }))
    expect(cookieNow(CONSENT_COOKIE)).toBe("granted")
    expect(cookieNow()).toBe("denied")
  })

  it("speaks the language it is handed, in the notice, the footer and the status line", async () => {
    const user = userEvent.setup()
    renderLanding(null, en.landing.consent)

    expect(screen.getByRole("region", { name: "Measurement cookies" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Accept" }))
    expect(screen.getByRole("status")).toHaveTextContent("Choice saved: you accepted Beelink's measurement cookies.")
    expect(screen.getByRole("button", { name: "Cookies" })).toBeInTheDocument()
  })

  /** A screen `SiteConsentGate` is not around: nothing is asked, and nothing may be loaded on the answer. */
  it("outside the gate draws nothing, loads nothing and writes no cookie", () => {
    const { container } = render(
      <>
        <LandingConsentLive privacyHref="/privacidade" text={ptBR.landing.consent} />
        <Loader />
        <LandingConsentReopen label="Cookies" />
      </>,
    )

    expect(container.innerHTML).toBe('<span data-testid="analytics">parado</span>')
    expect(cookieNow()).toBeUndefined()
  })
})
