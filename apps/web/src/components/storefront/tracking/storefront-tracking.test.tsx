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
import { StorefrontConsentGate } from "../storefront-consent-gate"
import { StorefrontConsentReopen } from "../storefront-consent-reopen"
import { StorefrontTracking } from "./storefront-tracking"
import { TrackView } from "./track-view"
import { useTrack } from "./use-track"
import { CONSENT_COOKIE, type ConsentChoice } from "@/lib/consent-cookie"

const mocks = vi.hoisted(() => ({ pathname: "/loja-a" }))

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }))
// The real one fetches the address; here it only has to say whether the page asked for it.
vi.mock("next/script", () => ({ default: ({ src }: { src: string }) => <script data-testid="pixel-library" data-src={src} /> }))

const PIXEL_A = "123456789012345"
const PIXEL_B = "999888777666555"
const colors = { background: "white", primary: "rebeccapurple", header: "navy", footer: "navy" }
const HAZE = { id: "p-1", name: "Haze", priceCents: 12990, category: null }

interface Shop {
  slug: string
  pixelId: string | null
  choice?: ConsentChoice | null
}

function Buy() {
  const track = useTrack()

  return <button onClick={() => track({ name: "AddToCart", item: { productId: HAZE.id, name: HAZE.name, unitPriceCents: HAZE.priceCents, qty: 1 } })}>Comprar</button>
}

/** A shop's layout as `app/[slug]/layout.tsx` draws it: the answer around the tracking, around a page. Keyed by the shop, as two shops are two layouts. */
function shop({ slug, pixelId, choice = null }: Shop, page = <TrackView event={{ name: "ViewContent", product: HAZE }} viewKey={HAZE.id} />) {
  return (
    <StorefrontConsentGate key={slug} slug={slug} store={{ metaPixelId: pixelId, colors }} choice={choice} messages={ptBR}>
      <StorefrontTracking pixelId={pixelId} quietPaths={[`/${slug}/redefinir-senha`]}>
        {page}
        <Buy />
        <StorefrontConsentReopen label="Cookies" />
      </StorefrontTracking>
    </StorefrontConsentGate>
  )
}

const calls = () => (window.fbq?.queue ?? []).map((call) => [...call])
/** Every event sent, as `pixel id · event name`, in order. */
const sent = () => calls().filter(([command]) => command === "trackSingle").map(([, pixelId, name]) => `${pixelId} · ${name}`)
const library = () => screen.queryByTestId("pixel-library")

function at(pathname: string) {
  mocks.pathname = pathname
  window.history.replaceState(null, "", pathname)
}

beforeEach(() => at("/loja-a"))

afterEach(() => {
  delete window.fbq
  delete window._fbq
  for (const slug of ["loja-a", "loja-b"]) document.cookie = `${CONSENT_COOKIE}=; Path=/${slug}; Max-Age=0`
})

describe("StorefrontTracking, before a yes", () => {
  it.each([
    ["a visitor who has not answered", { slug: "loja-a", pixelId: PIXEL_A, choice: null }],
    ["a visitor who refused", { slug: "loja-a", pixelId: PIXEL_A, choice: "denied" }],
    ["a shop with no pixel, whatever an old cookie says", { slug: "loja-a", pixelId: null, choice: "granted" }],
  ] as const)("loads nothing of Meta's and sends nothing, for %s", async (_name, visit) => {
    render(shop(visit))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(library()).toBeNull()
    expect(window.fbq).toBeUndefined()
  })
})

describe("StorefrontTracking, at a yes", () => {
  it("loads the library and starts the shop's pixel on the page, with no reload, and tells where the visitor is", async () => {
    render(shop({ slug: "loja-a", pixelId: PIXEL_A }))
    expect(library()).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(library()).toHaveAttribute("data-src", "https://connect.facebook.net/en_US/fbevents.js")
    expect(calls().slice(0, 4)).toEqual([
      ["consent", "grant"],
      ["set", "autoConfig", false, PIXEL_A],
      ["init", PIXEL_A],
      ["set", "trackSingleOnly", true, PIXEL_A],
    ])
    expect(sent()).toEqual([`${PIXEL_A} · PageView`, `${PIXEL_A} · ViewContent`])
  })

  it("does the same at the load of a visitor who had said yes: the page first, then what is on it", () => {
    render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    expect(library()).not.toBeNull()
    expect(sent()).toEqual([`${PIXEL_A} · PageView`, `${PIXEL_A} · ViewContent`])
  })

  it("never tells afterwards what the visitor did before the yes", async () => {
    render(shop({ slug: "loja-a", pixelId: PIXEL_A }))

    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(sent()).not.toContain(`${PIXEL_A} · AddToCart`)

    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))
    expect(sent().at(-1)).toBe(`${PIXEL_A} · AddToCart`)
  })

  it("gives every event an id of its own, as the fourth argument", async () => {
    render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    const ids = calls().filter(([command]) => command === "trackSingle").map((call) => (call[4] as { eventID: string }).eventID)

    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })
})

describe("StorefrontTracking, page views", () => {
  it("tells one per page: once at the load, once at each move to another path, never twice for the same", () => {
    const view = render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }, <p>início</p>))
    const pageViews = () => sent().filter((event) => event.endsWith("PageView")).length
    expect(pageViews()).toBe(1)

    // The same page drawn again — a filter, a combination picked — is the same page.
    view.rerender(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }, <p>início, filtrado</p>))
    expect(pageViews()).toBe(1)

    at("/loja-a/produtos")
    view.rerender(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }, <p>produtos</p>))
    expect(pageViews()).toBe(2)
  })

  it("tells nothing, the page view included, from a page whose address carries a token", () => {
    at("/loja-a/redefinir-senha")
    render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    expect(sent()).toEqual([])
  })
})

describe("StorefrontTracking, a yes taken back", () => {
  it("stops sending at the click and revokes the library's consent, with no reload", async () => {
    render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))
    const before = sent().length

    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(calls().at(-1)).toEqual(["consent", "revoke"])
    expect(sent()).toHaveLength(before)
  })

  it("leaves Meta's cookies alone: they are the domain's, and another shop's yes may rest on them", async () => {
    document.cookie = "_fbp=fb.1.1.1; Path=/"
    render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }))

    expect(document.cookie).toContain("_fbp=fb.1.1.1")
    document.cookie = "_fbp=; Path=/; Max-Age=0"
  })

  it("grants again before anything else when the visitor says yes once more", async () => {
    render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }))
    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    const after = calls().slice(calls().findIndex(([, action]) => action === "revoke"))
    expect(after.map(([command, second, third]) => (command === "trackSingle" ? `${second} · ${third}` : `${command} ${second}`))).toEqual(["consent revoke", "consent grant", `${PIXEL_A} · AddToCart`])
    // One pixel still: the second yes does not start it again.
    expect(calls().filter(([command]) => command === "init")).toHaveLength(1)
  })
})

describe("StorefrontTracking, two shops in one tab", () => {
  it("sends nothing to shop A's pixel from shop B's pages, and nothing to B's without B's own yes", async () => {
    // Shop A, where the visitor said yes.
    const tab = render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))
    const atA = [`${PIXEL_A} · PageView`, `${PIXEL_A} · ViewContent`, `${PIXEL_A} · AddToCart`]
    expect(sent()).toEqual(atA)

    // On to shop B by a link, with no reload: B has a pixel of its own and was given no answer.
    at("/loja-b")
    tab.rerender(shop({ slug: "loja-b", pixelId: PIXEL_B }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(sent()).toEqual(atA)
    expect(calls().at(-1)).toEqual(["consent", "revoke"])
    expect(calls().filter(([command]) => command === "init")).toEqual([["init", PIXEL_A]])

    // B's own yes: its pixel is started, and everything from here goes to it alone.
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(sent().slice(atA.length)).toEqual([`${PIXEL_B} · PageView`, `${PIXEL_B} · ViewContent`, `${PIXEL_B} · AddToCart`])
    expect(calls().map(([command]) => command)).not.toContain("track")
  })

  it("shuts the library at a shop with no pixel at all, and opens it again back at shop A without starting A's pixel twice", async () => {
    const tab = render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    at("/loja-b")
    tab.rerender(shop({ slug: "loja-b", pixelId: null }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))
    expect(calls().at(-1)).toEqual(["consent", "revoke"])

    at("/loja-a")
    tab.rerender(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    expect(calls().filter(([command]) => command === "init")).toEqual([["init", PIXEL_A]])
    expect(calls().slice(calls().findIndex(([, action]) => action === "revoke"))[1]).toEqual(["consent", "grant"])
    expect(sent().every((event) => event.startsWith(PIXEL_A))).toBe(true)
  })

  it("shuts the library when the visitor leaves the shops altogether", () => {
    const tab = render(shop({ slug: "loja-a", pixelId: PIXEL_A, choice: "granted" }))

    act(() => tab.unmount())

    expect(calls().at(-1)).toEqual(["consent", "revoke"])
  })
})

describe("the storefront's tracking, where it lives", () => {
  it("does nothing outside a shop's layout — the panel and the design preview draw the same blocks", async () => {
    render(<Buy />)
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(window.fbq).toBeUndefined()
  })

  const src = join(process.cwd(), "src")
  const sources = (readdirSync(src, { recursive: true }) as string[]).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file)).map((file) => ({ file, text: readFileSync(join(src, file), "utf8") }))

  it("is mounted by the shop's layout and nowhere else", () => {
    expect(sources.filter(({ text }) => text.includes("<StorefrontTracking")).map(({ file }) => file)).toEqual(["app/[slug]/layout.tsx"])
  })

  it("keeps Meta's function in one file: no component, hook or page names fbq", () => {
    expect(sources.filter(({ text }) => /\bfbq\b/.test(text)).map(({ file }) => file)).toEqual(["lib/meta-pixel.ts"])
  })

  it("keeps Meta's library behind the same door: one file knows its address, one draws its script", () => {
    expect(sources.filter(({ text }) => /facebook\.net/.test(text)).map(({ file }) => file)).toEqual(["lib/meta-pixel.ts"])
    expect(sources.filter(({ text }) => text.includes("META_PIXEL_SRC") && !text.includes("export const META_PIXEL_SRC")).map(({ file }) => file)).toEqual(["components/storefront/tracking/storefront-tracking.tsx"])
  })
})
