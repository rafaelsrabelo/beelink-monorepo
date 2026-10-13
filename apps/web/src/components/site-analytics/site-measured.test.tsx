// React
import type { ReactElement } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { SITE_CONSENT_COOKIE, type SiteConsentChoice } from "@/lib/site-consent-cookie"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ jar: {} as Record<string, string>, env: { SITE_GA_MEASUREMENT_ID: undefined as string | undefined } }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in mocks.jar ? { value: mocks.jar[name] } : undefined) }),
}))
vi.mock("@/lib/server-env", () => ({ serverEnv: mocks.env }))
vi.mock("next/navigation", () => ({ usePathname: () => "/login", useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("next/script", () => ({ default: ({ src }: { src: string }) => <script data-testid="google-library" data-src={src} /> }))

const { SiteMeasured } = await import("./site-measured")
const { SiteAnalytics } = await import("./site-analytics")

const ID = "G-TEST000000"

/** A request as it arrives: the same cookie in the browser's jar and in the server's reading of it. */
function arriveWith(answer: SiteConsentChoice | null, others: Record<string, string> = {}) {
  mocks.jar = { ...others, ...(answer ? { [SITE_CONSENT_COOKIE]: answer } : {}) }
  for (const [name, value] of Object.entries(mocks.jar)) document.cookie = `${name}=${value}; Path=/`
}

/** What the server hands the component that runs in the browser — which is what is written into the page. */
async function handedOver(): Promise<{ measurementId: string | null; drawnFor: SiteConsentChoice | null } | null> {
  const tree: ReactElement<{ children: ReactElement<{ measurementId: string | null; drawnFor: SiteConsentChoice | null }> }> = await SiteMeasured({ children: <p>a página</p> })
  const analytics = tree.props.children

  expect(analytics.type).toBe(SiteAnalytics)
  return { measurementId: analytics.props.measurementId, drawnFor: analytics.props.drawnFor }
}

const library = () => screen.queryByTestId("google-library")

beforeEach(() => {
  mocks.env.SITE_GA_MEASUREMENT_ID = ID
  mocks.jar = {}
  window.history.replaceState(null, "", "/login")
})

afterEach(() => {
  delete window.dataLayer
  delete window[`ga-disable-${ID}`]
  for (const name of [SITE_CONSENT_COOKIE, "bl_consent"]) document.cookie = `${name}=; Path=/; Max-Age=0`
})

/** BEELINK-320: the ID reaches the browser of a visitor who said yes, on a page that is measured, and no other. */
describe("SiteMeasured", () => {
  it("hands the ID to a visitor whose yes it read, and the page loads the library with it", async () => {
    arriveWith("granted")

    expect(await handedOver()).toEqual({ measurementId: ID, drawnFor: "granted" })

    render(await SiteMeasured({ children: <p>a página</p> }))
    expect(screen.getByText("a página")).toBeInTheDocument()
    expect(library()).toHaveAttribute("data-src", `https://www.googletagmanager.com/gtag/js?id=${ID}`)
  })

  it.each([
    ["was never asked", null],
    ["refused", "denied"],
  ] as const)("keeps the ID from a visitor who %s, and the page loads nothing", async (_name, answer) => {
    arriveWith(answer)

    expect(await handedOver()).toEqual({ measurementId: null, drawnFor: answer })

    const { container } = render(await SiteMeasured({ children: <p>a página</p> }))
    expect(screen.getByText("a página")).toBeInTheDocument()
    expect(library()).toBeNull()
    expect(container.innerHTML).not.toContain(ID)
    expect(window.dataLayer).toBeUndefined()
  })

  it("is not answered by a shop's yes, nor by a cookie somebody edited", async () => {
    arriveWith(null, { bl_consent: "granted" })
    expect((await handedOver())?.measurementId).toBeNull()

    mocks.jar = { [SITE_CONSENT_COOKIE]: "yes" }
    expect(await handedOver()).toEqual({ measurementId: null, drawnFor: null })
  })

  it("with no measurement ID configured draws the page and nothing else, whatever cookie a visitor carries", async () => {
    mocks.env.SITE_GA_MEASUREMENT_ID = undefined
    arriveWith("granted")

    expect(await handedOver()).toEqual({ measurementId: null, drawnFor: "granted" })

    const { container } = render(await SiteMeasured({ children: <p>a página</p> }))
    expect(container.innerHTML).toBe("<p>a página</p>")
    expect(window.dataLayer).toBeUndefined()
  })
})
