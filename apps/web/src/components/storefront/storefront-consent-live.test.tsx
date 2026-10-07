// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ConsentProvider, useConsent } from "./consent-provider"
import { StorefrontConsentLive } from "./storefront-consent-live"
import { StorefrontConsentReopen } from "./storefront-consent-reopen"
import { CONSENT_COOKIE, decodeConsent, type ConsentChoice } from "@/lib/consent-cookie"

function cookieNow(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1)
}

/** Stands in for what X5 brings: something on the page that follows the answer. */
function Loader() {
  const choice = useConsent((consent) => consent.choice)
  return <span data-testid="pixel">{choice === "granted" ? "carregado" : "parado"}</span>
}

/** A shop's page as the layout builds it: the strip above, the page and its footer below. */
function renderShop(choice: ConsentChoice | null) {
  return render(
    <ConsentProvider slug="loja" choice={choice}>
      <StorefrontConsentLive privacyHref="/privacidade" messages={ptBR} />
      <Loader />
      <footer>
        <StorefrontConsentReopen label="Cookies" />
      </footer>
    </ConsentProvider>,
  )
}

const strip = () => screen.queryByRole("region", { name: "Cookies de anúncios" })

beforeEach(() => {
  // The cookie is scoped to the shop's path, so the page has to be on it to read it back.
  window.history.replaceState(null, "", "/loja")
})

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE}=; Path=/loja; Max-Age=0`
})

/** BEELINK-271 */
describe("the storefront's cookie strip, live", () => {
  it("asks a visitor who has not answered, with nothing loaded and no cookie written", () => {
    renderShop(null)

    expect(strip()).toBeInTheDocument()
    expect(screen.getByTestId("pixel")).toHaveTextContent("parado")
    expect(cookieNow()).toBeUndefined()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("keeps a yes, leaves the page, says so aloud — and the page learns of it with no reload", async () => {
    const user = userEvent.setup()
    renderShop(null)

    await user.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(strip()).not.toBeInTheDocument()
    expect(decodeConsent(cookieNow())).toBe("granted")
    expect(screen.getByTestId("pixel")).toHaveTextContent("carregado")
    expect(screen.getByRole("status")).toHaveTextContent("Escolha salva: você aceitou os cookies de anúncios desta loja.")
  })

  it("keeps a refusal as easily, and nothing is loaded", async () => {
    const user = userEvent.setup()
    renderShop(null)

    await user.click(screen.getByRole("button", { name: "Recusar" }))

    expect(strip()).not.toBeInTheDocument()
    expect(decodeConsent(cookieNow())).toBe("denied")
    expect(screen.getByTestId("pixel")).toHaveTextContent("parado")
    expect(screen.getByRole("status")).toHaveTextContent("Escolha salva: você recusou os cookies de anúncios desta loja.")
  })

  it("does not ask again a visitor whose answer the server read from the cookie", () => {
    renderShop("denied")

    expect(strip()).not.toBeInTheDocument()
    // Read from the cookie, it is not news: nothing is announced on every page.
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("opens again from the footer, with the focus and the answer in force — and a yes can be taken back", async () => {
    const user = userEvent.setup()
    renderShop("granted")
    expect(screen.getByTestId("pixel")).toHaveTextContent("carregado")

    await user.click(screen.getByRole("button", { name: "Cookies" }))

    const reopened = strip()!
    expect(reopened).toHaveFocus()
    expect(within(reopened).getByText("Sua escolha atual: você aceitou.")).toBeInTheDocument()

    await user.click(within(reopened).getByRole("button", { name: "Recusar" }))

    expect(strip()).not.toBeInTheDocument()
    expect(decodeConsent(cookieNow())).toBe("denied")
    expect(screen.getByTestId("pixel")).toHaveTextContent("parado")
    // The strip left with the click; the focus goes back to where the visitor asked from.
    expect(screen.getByRole("button", { name: "Cookies" })).toHaveFocus()
  })

  it("takes the focus from the footer even while the first question is still on the page", async () => {
    const user = userEvent.setup()
    renderShop(null)

    await user.click(screen.getByRole("button", { name: "Cookies" }))

    expect(strip()).toHaveFocus()
    expect(screen.queryByText(/Sua escolha atual/)).not.toBeInTheDocument()
  })

  it("never holds the focus: a keyboard walks through the strip and on to the page", async () => {
    const user = userEvent.setup()
    renderShop(null)

    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole("button", { name: "Aceitar" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Cookies" })).toHaveFocus()
  })

  /** The panel's design preview draws the footer with no shop layout above it. */
  it("outside a shop's pages draws no strip, loads nothing and its footer button does nothing", async () => {
    const user = userEvent.setup()
    render(
      <>
        <StorefrontConsentLive privacyHref="/privacidade" messages={ptBR} />
        <Loader />
        <StorefrontConsentReopen label="Cookies" />
      </>,
    )

    expect(strip()).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cookies" }))

    expect(strip()).not.toBeInTheDocument()
    expect(screen.getByTestId("pixel")).toHaveTextContent("parado")
    expect(cookieNow()).toBeUndefined()
  })
})
