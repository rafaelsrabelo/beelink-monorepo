// Node
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { LandingConsentLive } from "../landing/landing-consent-live"
import { LandingConsentReopen } from "../landing/landing-consent-reopen"
import { SiteConsentGate } from "../landing/site-consent-gate"
import { SiteAnalytics } from "./site-analytics"
import { useSiteTrack } from "./use-site-track"
import { onRouterTransitionStart } from "@/instrumentation-client"
import { siteAnalyticsIdFor } from "@/lib/site-analytics"
import { SITE_CONSENT_COOKIE, type SiteConsentChoice } from "@/lib/site-consent-cookie"

const mocks = vi.hoisted(() => ({ pathname: "/", refresh: vi.fn() }))

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ refresh: mocks.refresh }) }))
// The real one fetches the address; here it only has to say whether the page asked for it.
vi.mock("next/script", () => ({ default: ({ src }: { src: string }) => <script data-testid="google-library" data-src={src} /> }))

const ID = "G-TEST000000"
const LOCK = `ga-disable-${ID}` as const

function SignUp() {
  const track = useSiteTrack()

  return <button onClick={() => track({ name: "sign_up" })}>Criar conta</button>
}

interface Visit {
  /** What the deployment is configured with; left out, the test's ID. */
  configured?: string | undefined
  /** What the server read from the visitor's cookie when it drew the page. */
  answer: SiteConsentChoice | null
}

/** A measured page as `SiteMeasured` builds it, with the landing's notice and its footer inside. */
function page(input: Visit) {
  const configured = "configured" in input ? input.configured : ID
  const { answer } = input

  return (
    <SiteConsentGate measurementId={configured} choice={answer}>
      <SiteAnalytics measurementId={siteAnalyticsIdFor(configured, answer)} drawnFor={answer} title="A página">
        <LandingConsentLive privacyHref="/privacidade" text={ptBR.landing.consent} />
        <SignUp />
        <LandingConsentReopen label="Cookies" />
      </SiteAnalytics>
    </SiteConsentGate>
  )
}

/** The library opens one task after the page is there, never inside the event that brought it. */
const settled = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))

/** A visit as a browser makes it: the cookie it holds is the one the server read. */
async function visit(input: Visit) {
  if (input.answer) document.cookie = `${SITE_CONSENT_COOKIE}=${input.answer}; Path=/`
  const drawn = render(page(input))
  await settled()
  return drawn
}

async function click(name: string) {
  await userEvent.click(screen.getByRole("button", { name }))
  await settled()
}

/** Everything the library was told, in order: with none loaded, every call waits in its queue. */
const calls = () => (window.dataLayer ?? []).map((call) => Array.from(call as ArrayLike<unknown>))
/** Every event sent, as `name → the ID it is addressed to @ the page told`. */
const sent = () =>
  calls()
    .filter(([command]) => command === "event")
    .map(([, name, params]) => `${name} → ${(params as { send_to: string }).send_to} @ ${(params as { page_location: string }).page_location}`)
const library = () => screen.queryByTestId("google-library")
const cookieNames = () => document.cookie.split("; ").map((entry) => entry.split("=")[0])

function at(address: string) {
  mocks.pathname = address.split("?")[0]
  window.history.replaceState(null, "", address)
}

beforeEach(() => at("/"))

afterEach(() => {
  mocks.refresh.mockClear()
  delete window.dataLayer
  delete window[LOCK]
  for (const name of [SITE_CONSENT_COOKIE, "_ga", "_ga_TEST000000", "bl_consent"]) document.cookie = `${name}=; Path=/; Max-Age=0`
})

describe("SiteAnalytics, before a yes", () => {
  it.each([
    ["a visitor who has not answered", { answer: null }],
    ["a visitor who refused", { answer: "denied" }],
    ["a deployment with no measurement ID, whatever an old cookie says", { configured: undefined, answer: "granted" }],
  ] as const)("loads nothing of Google's, creates no queue and sends nothing, for %s", async (_name, input) => {
    await visit(input)
    await click("Criar conta")

    expect(library()).toBeNull()
    expect(window.dataLayer).toBeUndefined()
    expect(window[LOCK]).toBeUndefined()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  // On the platform's host a shop's answer may sit beside the site's; it is an answer to another question.
  it("is not started by a shop's yes", async () => {
    document.cookie = "bl_consent=granted; Path=/"
    await visit({ answer: null })

    expect(library()).toBeNull()
    expect(window.dataLayer).toBeUndefined()
  })
})

describe("SiteAnalytics, with a yes", () => {
  it("loads the library with the configured ID and tells the page, once, to that ID", async () => {
    await visit({ answer: "granted" })

    expect(library()).toHaveAttribute("data-src", "https://www.googletagmanager.com/gtag/js?id=G-TEST000000")
    expect(calls().map(([command, second]) => (command === "js" ? "js" : `${command} ${second}`))).toEqual(["consent default", "js", "consent update", `config ${ID}`, "event page_view"])
    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/`])
    expect(window[LOCK]).toBe(false)
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it("tells a page once, however often it is drawn again", async () => {
    const { rerender } = await visit({ answer: "granted" })
    rerender(page({ answer: "granted" }))
    rerender(page({ answer: "granted" }))
    await settled()

    expect(sent()).toHaveLength(1)
  })

  // Back and Forward tell every listener the address changed — the library's among them — in the very event that draws the page.
  it("is still shut while the event that brought the page is being heard, and opens once it is over", async () => {
    document.cookie = `${SITE_CONSENT_COOKIE}=granted; Path=/`
    render(page({ answer: "granted" }))

    expect(window.dataLayer).toBeUndefined()
    expect(window[LOCK]).toBeUndefined()

    await settled()

    expect(window[LOCK]).toBe(false)
    expect(sent()).toHaveLength(1)
  })

  it("opens again after Back or Forward within the page itself, without telling the page twice", async () => {
    await visit({ answer: "granted" })

    // What the hook does when the router says a navigation began, and then the browser's own event.
    onRouterTransitionStart("http://localhost:3000/", "traverse")
    expect(window[LOCK]).toBe(true)
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(window[LOCK]).toBe(true)

    await settled()

    expect(window[LOCK]).toBe(false)
    expect(sent()).toHaveLength(1)
  })

  it("tells the page without the parameters its address brought, but for a campaign's labels", async () => {
    at("/login?voltar=%2Fadmin%2Floja-da-ana%2Forders%2F1042&utm_source=instagram&email=ana%40exemplo.com#form")
    await visit({ answer: "granted" })

    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/login?utm_source=instagram`])
    expect(JSON.stringify(calls())).not.toMatch(/voltar|loja-da-ana|exemplo\.com|%40/)
  })

  it("at a yes given on the page, asks the server for the page again and loads nothing until the ID arrives", async () => {
    const { rerender } = await visit({ answer: null })

    await click("Aceitar")

    // The server kept the ID from a visitor who had not said yes: there is nothing to load with, yet.
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(library()).toBeNull()
    expect(window.dataLayer).toBeUndefined()

    rerender(page({ answer: "granted" }))
    await settled()

    expect(library()).toHaveAttribute("data-src", "https://www.googletagmanager.com/gtag/js?id=G-TEST000000")
    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/`])
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    // The answer stays said: the page drawn again is the same page.
    expect(screen.getByRole("status")).toHaveTextContent("Escolha salva: você aceitou os cookies de medição da Beelink.")
  })

  it("tells an account created as that alone: the event's name, the page, and the ID it goes to", async () => {
    at("/signup")
    await visit({ answer: "granted" })

    await click("Criar conta")

    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/signup`, `sign_up → ${ID} @ http://localhost:3000/signup`])
    expect(calls().at(-1)).toEqual(["event", "sign_up", { page_location: "http://localhost:3000/signup", page_title: "A página", send_to: ID }])
  })

  // On arriving without a reload the document still holds the title of the page before, or none: it is never read.
  it("tells the title the page was given, whatever the document's says", async () => {
    document.title = "Pedido 1042 — Loja da Ana"
    await visit({ answer: "granted" })

    expect(calls().filter(([command]) => command === "config" || command === "event").map(([, , params]) => (params as { page_title?: string }).page_title)).toEqual(["A página", "A página"])
    expect(JSON.stringify(calls())).not.toContain("Loja da Ana")
  })

  it("shuts the library when the page is left", async () => {
    const { unmount } = await visit({ answer: "granted" })

    unmount()

    expect(window[LOCK]).toBe(true)
  })

  it("never opens for a page left before it was told", async () => {
    document.cookie = `${SITE_CONSENT_COOKIE}=granted; Path=/`
    const { unmount } = render(page({ answer: "granted" }))

    unmount()
    await settled()

    expect(window.dataLayer).toBeUndefined()
  })

  it("counts another view at the next measured page, and opens the library there again", async () => {
    const first = await visit({ answer: "granted" })
    first.unmount()

    at("/signup")
    await visit({ answer: "granted" })

    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/`, `page_view → ${ID} @ http://localhost:3000/signup`])
    expect(window[LOCK]).toBe(false)
  })
})

describe("SiteAnalytics, at a yes taken back", () => {
  it("stops sending at once, tells the library measurement is refused, and takes Google's cookies out", async () => {
    await visit({ answer: "granted" })
    document.cookie = "_ga=GA1.1.1.2; Path=/"
    document.cookie = "_ga_TEST000000=GS1.1.3.4; Path=/"

    await click("Cookies")
    await click("Recusar")
    await click("Criar conta")

    expect(window[LOCK]).toBe(true)
    expect(calls().at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }])
    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/`])
    expect(cookieNames()).toEqual([SITE_CONSENT_COOKIE])
    expect(library()).toBeNull()
    // The server is asked for the page again, and draws it without the ID.
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it("tells the page again at a yes given again", async () => {
    await visit({ answer: "granted" })

    await click("Cookies")
    await click("Recusar")
    await click("Cookies")
    await click("Aceitar")

    expect(window[LOCK]).toBe(false)
    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/`, `page_view → ${ID} @ http://localhost:3000/`])
    expect(calls().filter(([command, action]) => command === "consent" && action === "update").map(([, , state]) => state)).toEqual([{ analytics_storage: "granted" }, { analytics_storage: "denied" }, { analytics_storage: "granted" }])
  })

  it("takes Google's cookies out for a visitor who refuses, having said yes long ago", async () => {
    document.cookie = "_ga=GA1.1.1.2; Path=/"
    await visit({ answer: null })

    // Not asked again yet: nothing is touched until they answer.
    expect(cookieNames()).toEqual(["_ga"])

    await click("Recusar")

    expect(cookieNames()).toEqual([SITE_CONSENT_COOKIE])
    expect(window.dataLayer).toBeUndefined()
  })
})

/** A page the router kept — the one Back returns to — is drawn for the answer of when it was kept. */
describe("SiteAnalytics, on a page drawn for an answer since changed", () => {
  it("loads nothing for a yes the browser no longer holds, and asks the server for the page again", async () => {
    document.cookie = `${SITE_CONSENT_COOKIE}=denied; Path=/`
    document.cookie = "_ga=GA1.1.1.2; Path=/"
    render(page({ answer: "granted" }))
    await settled()

    expect(library()).toBeNull()
    expect(window.dataLayer).toBeUndefined()
    expect(cookieNames()).toEqual([SITE_CONSENT_COOKIE])
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it("loads nothing where the browser holds no answer at all — cookies cleared, or refused by the browser", async () => {
    render(page({ answer: "granted" }))
    await settled()

    expect(library()).toBeNull()
    expect(window.dataLayer).toBeUndefined()
  })

  it("stops telling once another tab took the yes back, before this page is drawn again", async () => {
    await visit({ answer: "granted" })
    document.cookie = `${SITE_CONSENT_COOKIE}=denied; Path=/`

    await click("Criar conta")

    expect(sent()).toEqual([`page_view → ${ID} @ http://localhost:3000/`])
  })
})

/** Where the script may load is where these are mounted: that is what is pinned. */
describe("Beelink's own measurement, in the source", () => {
  const src = join(process.cwd(), "src")
  const sources = (readdirSync(src, { recursive: true }) as string[])
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => ({ file: file.replaceAll("\\", "/"), text: readFileSync(join(src, file), "utf8") }))
  const importersOf = (name: string) =>
    sources
      .filter(({ text }) => new RegExp(`from "[^"]*/${name}"`).test(text))
      .map(({ file }) => file)
      .sort()

  it("is mounted by the landing, the sign-in and the sign-up — no layout, no shop's page, no panel's, no other signed-out screen", () => {
    expect(importersOf("site-measured")).toEqual(["app/(auth)/login/page.tsx", "app/(auth)/signup/page.tsx", "app/page.tsx"])
    expect(sources.filter(({ text }) => /import \{ SiteAnalytics[ ,}]/.test(text)).map(({ file }) => file)).toEqual(["components/site-analytics/site-measured.tsx"])
  })

  it("reaches Google's library through one component, and through the hook that shuts it when a navigation begins", () => {
    expect(importersOf("google-analytics")).toEqual(["components/site-analytics/site-analytics.tsx", "instrumentation-client.ts", "lib/site-analytics.ts"])
    // The third names a type alone: what a page is told as.
    expect(sources.find(({ file }) => file === "lib/site-analytics.ts")?.text).toMatch(/import type \{ GoogleAnalyticsPage \} from "\.\/google-analytics"/)
  })

  it("reads the measurement ID from the environment in one place, the one that decides who is handed it", () => {
    const reads = (text: string) => text.split("\n").some((line) => /serverEnv\.SITE_GA_MEASUREMENT_ID/.test(line) && !/^\s*(\*|\/\/|\/\*)/.test(line))

    expect(sources.filter(({ text }) => reads(text)).map(({ file }) => file)).toEqual(["components/site-analytics/site-measured.tsx"])
  })
})
