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
import { StorefrontConsentGate, type StorefrontConsentGateProps } from "./storefront-consent-gate"
import { StorefrontConsentReopen } from "./storefront-consent-reopen"
import { CONSENT_COOKIE } from "@/lib/consent-cookie"

const colors = { background: "white", primary: "rebeccapurple", header: "navy", footer: "navy" }
const withPixel = { metaPixelId: "123456789012345", colors }
const withoutPixel = { metaPixelId: null, colors }

function renderGate(store: StorefrontConsentGateProps["store"], choice: StorefrontConsentGateProps["choice"] = null) {
  return render(
    <StorefrontConsentGate slug="loja" store={store} choice={choice} messages={ptBR}>
      <main>
        a página da loja
        <StorefrontConsentReopen label="Cookies" />
      </main>
    </StorefrontConsentGate>,
  )
}

const strip = () => screen.queryByRole("region", { name: "Cookies de anúncios" })

beforeEach(() => {
  window.history.replaceState(null, "", "/loja")
})

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE}=; Path=/loja; Max-Age=0`
})

/** BEELINK-271: the strip is a shop with a pixel's, and nobody else's. */
describe("StorefrontConsentGate", () => {
  it("asks at a shop that connected a Meta Pixel, above its pages and in its colours", () => {
    renderGate(withPixel)

    const region = strip()!
    expect(region).toBeInTheDocument()
    expect(region.compareDocumentPosition(screen.getByRole("main")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The layout is outside the shop's window, so the palette is set where the strip is.
    expect(region.parentElement!.style.getPropertyValue("--shop-background")).toBe("white")
    expect(region.parentElement!.style.getPropertyValue("--shop-primary")).toBe("rebeccapurple")
  })

  it("draws the pages while the question stands: nothing waits for an answer", () => {
    renderGate(withPixel)

    expect(screen.getByRole("main")).toHaveTextContent("a página da loja")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows no strip at a shop with no pixel, and nothing there can write the cookie", async () => {
    const user = userEvent.setup()
    renderGate(withoutPixel)

    expect(strip()).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    // Even a footer button that should not be there finds no state to change.
    await user.click(screen.getByRole("button", { name: "Cookies" }))
    expect(strip()).not.toBeInTheDocument()
    expect(document.cookie).not.toContain(CONSENT_COOKIE)
  })

  it("shows no strip at a shop with no pixel even to a visitor carrying a yes from when it had one", () => {
    renderGate(withoutPixel, "granted")

    expect(strip()).not.toBeInTheDocument()
  })

  it("draws the page alone for an address nobody holds", () => {
    renderGate(null)

    expect(strip()).not.toBeInTheDocument()
    expect(screen.getByRole("main")).toBeInTheDocument()
  })

  it("does not ask again at a shop with a pixel once the visitor answered", () => {
    renderGate(withPixel, "denied")

    expect(strip()).not.toBeInTheDocument()
  })

  /**
   * The panel and its design preview draw the shop's frame, and must never draw the strip. What keeps
   * that true is where the strip is mounted, so that is what is pinned: the shop's own layout, which
   * neither of them passes through, and nowhere else.
   */
  it("is mounted by the shop's layout alone, and is the only thing that mounts the strip", () => {
    const src = join(process.cwd(), "src")
    const sources = (readdirSync(src, { recursive: true }) as string[])
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .map((file) => ({ file: file.replaceAll("\\", "/"), text: readFileSync(join(src, file), "utf8") }))
    const importersOf = (name: string) => sources.filter(({ text }) => new RegExp(`from "[^"]*/${name}"`).test(text)).map(({ file }) => file)

    expect(importersOf("storefront-consent-gate")).toEqual(["app/[slug]/layout.tsx"])
    expect(importersOf("storefront-consent-live")).toEqual(["components/storefront/storefront-consent-gate.tsx"])
  })
})
