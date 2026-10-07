// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { PanelCounts, User } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { AppShell } from "./app-shell"

const mocks = vi.hoisted(() => ({ pathname: "/admin/loja/orders" }))

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/services/auth/auth-hooks", () => ({ useSignOut: () => ({ isPending: false, mutate: vi.fn() }) }))
vi.mock("@/components/locale-switcher", () => ({ LocaleSwitcher: () => null }))

const user = { id: "u", name: "Dona", email: "dona@exemplo.test" } as User
const STORES = [
  { slug: "loja", name: "Loja", logoUrl: null, type: "ECOMMERCE" },
  { slug: "site", name: "Site", logoUrl: null, type: "INSTITUTIONAL" },
]
const EMPTY_ORDERS = { orders: [], total: 0, page: 1, pageSize: 5 }
const EMPTY_CONVERSATIONS = { conversations: [], total: 0, page: 1, pageSize: 20 }

/** The BFF, stood in for by address; `counts` may be held back to look at the menu before it answers. */
function serve(counts: PanelCounts | Promise<Response>) {
  const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    if (url.endsWith("/panel-counts")) return counts instanceof Promise ? counts : Response.json(counts)
    if (url === "/api/stores") return Response.json(STORES)
    if (url.includes("/orders?")) return Response.json(EMPTY_ORDERS)
    if (url.includes("/conversations?")) return Response.json(EMPTY_CONVERSATIONS)
    return Response.json({ statusCode: 404, errorCode: "UNEXPECTED_CALL", message: url }, { status: 404 })
  })
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const asked = (fetched: ReturnType<typeof serve>) => fetched.mock.calls.map(([url]) => url)

function renderShell(railCollapsed = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return render(
    <AppShell user={user} ui={ui} web={web} locale="pt-BR" prefs={{ railCollapsed }}>
      <p>página</p>
    </AppShell>,
    { wrapper },
  )
}

beforeEach(() => {
  mocks.pathname = "/admin/loja/orders"
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.title = ""
})

describe("AppShell — the menu's live counts (BEELINK-309)", () => {
  it("puts each area's number on its item, said in words, and leaves the others plain", async () => {
    serve({ openOrders: 3, unreadConversations: 2, unreadMessages: 5, unseenReviews: 1 })
    renderShell()

    expect(await screen.findByRole("link", { name: "Pedidos, 3 em aberto" })).toHaveAttribute("href", "/admin/loja/orders")
    expect(screen.getByRole("link", { name: "Conversas, 2 conversas com mensagens não lidas" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Avaliações, 1 avaliação nova" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Produtos" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Clientes" })).toBeInTheDocument()
  })

  it("draws no badge at zero", async () => {
    const fetched = serve({ openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 })
    const { container } = renderShell()

    await waitFor(() => expect(asked(fetched)).toContain("/api/stores/loja/panel-counts"))
    await screen.findByRole("link", { name: "Pedidos" })
    expect(container.querySelector('[data-slot="nav-badge"]')).toBeNull()
  })

  it("draws no badge, no zero and no skeleton in the menu while the counts are on their way", async () => {
    let answer!: (response: Response) => void
    serve(new Promise<Response>((resolve) => (answer = resolve)))
    const { container } = renderShell()

    const orders = await screen.findByRole("link", { name: "Pedidos" })
    expect(orders).toHaveTextContent(/^Pedidos$/)
    expect(container.querySelector('aside [data-slot="nav-badge"], aside [data-slot="skeleton"]')).toBeNull()

    answer(Response.json({ openOrders: 12, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }))
    expect(await screen.findByRole("link", { name: "Pedidos, 12 em aberto" })).toBeInTheDocument()
  })

  it("keeps the number in the collapsed rail, with the same name", async () => {
    serve({ openOrders: 140, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 })
    renderShell(true)

    const orders = await screen.findByRole("link", { name: "Pedidos, 140 em aberto" })
    expect(orders.querySelector('[data-slot="nav-badge"]')).toHaveTextContent("99+")
  })

  it("makes one request for the counts — the bell's too — and none to the reads it replaced", async () => {
    const fetched = serve({ openOrders: 3, unreadConversations: 2, unreadMessages: 5, unseenReviews: 1 })
    renderShell()

    await screen.findByRole("link", { name: "Pedidos, 3 em aberto" })
    // The bell adds the unread messages from the same answer: 5, with no order waiting.
    await waitFor(() => expect(screen.getByRole("button", { name: "Notificações (5 não lidas)" })).toBeInTheDocument())

    const calls = asked(fetched)
    expect(calls.filter((url) => url.endsWith("/panel-counts"))).toEqual(["/api/stores/loja/panel-counts"])
    expect(calls.filter((url) => url.endsWith("/conversations/unread") || url.endsWith("/reviews/unseen"))).toEqual([])
    // What the bell still lists is its own: two pages of orders and the unread conversations.
    expect(calls.filter((url) => url.includes("/orders?")).sort()).toEqual(["/api/stores/loja/orders?payment=PAID_UNSEEN&pageSize=5", "/api/stores/loja/orders?status=RECEIVED&pageSize=5"])
    expect(calls.filter((url) => url.includes("/conversations?"))).toEqual(["/api/stores/loja/conversations?filter=UNREAD"])
  })

  it("has no counted item for an institutional site: no orders, no conversations, no badge", async () => {
    mocks.pathname = "/admin/site"
    serve({ openOrders: 9, unreadConversations: 9, unreadMessages: 9, unseenReviews: 9 })
    renderShell()

    // The menu turns into the site's once its shops are known.
    expect(await screen.findByRole("link", { name: "Leads" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Pedidos/ })).toBeNull()
    expect(screen.queryByRole("link", { name: /Conversas/ })).toBeNull()
    expect(screen.queryByRole("link", { name: /Avaliações/ })).toBeNull()
    // Whatever the answer said — the bell reads for any panel, as it did before — no item shows it.
    expect(document.querySelector('aside [data-slot="nav-badge"]')).toBeNull()
  })
})
