// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { OrderCancelLive } from "./order-cancel-live"
import { OrderCancelNotice } from "./order-cancel-notice"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

/** The shop's cancel handler, answering with `status` and `body`; the calls are remembered. */
function stubCancel(status: number, body: unknown): string[] {
  const calls: string[] = []
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${path}`)
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  })
  return calls
}

function renderCard({ notice = false } = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const card = (
    <article tabIndex={-1} aria-label="Pedido nº 12">
      <OrderCancelLive slug="loja" number={12} messages={ptBR} />
    </article>
  )
  return render(<QueryClientProvider client={client}>{notice ? <OrderCancelNotice messages={ptBR}>{card}</OrderCancelNotice> : card}</QueryClientProvider>)
}

async function confirmCancel() {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
  await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar pedido" }))
  return user
}

afterEach(() => {
  vi.unstubAllGlobals()
  refresh.mockReset()
})

describe("OrderCancelLive", () => {
  it("cancels through the shop's handler, reads the page again, and hands focus to the order", async () => {
    const calls = stubCancel(200, { number: 12, status: "CANCELLED" })
    renderCard()

    await confirmCancel()

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    expect(calls).toEqual(["POST /loja/api/orders/12/cancel"])
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(screen.getByRole("article", { name: "Pedido nº 12" })).toHaveFocus())
    // Shut until the redraw takes it away: a second cancel would only be refused.
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeDisabled()
  })

  /** On the tab of orders on their way the card leaves with the redraw: the line over the list says it, and keeps focus. */
  it("says the cancel over the list, and lands focus there rather than on a card that may leave", async () => {
    stubCancel(200, { number: 12, status: "CANCELLED" })
    renderCard({ notice: true })
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    await confirmCancel()

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pedido nº 12 cancelado."))
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus())
    expect(refresh).toHaveBeenCalledOnce()
  })

  /** Read at once, the page would redraw the card without its button and take the sentence away unread. */
  it("holds a refusal until it is read, and reads the page again once it is closed", async () => {
    stubCancel(409, { statusCode: 409, errorCode: "ORDER_NOT_CANCELLABLE", message: "Accepted" })
    renderCard()

    const user = await confirmCancel()

    expect(await screen.findByRole("alert")).toHaveTextContent("A loja já aceitou este pedido. Para cancelar, fale com a loja.")
    expect(refresh).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Manter pedido" }))
    expect(refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("tells a shopper whose session ended to sign in again to cancel", async () => {
    stubCancel(401, { statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "Sign in to cancel the order" })
    renderCard()

    await confirmCancel()

    expect(await screen.findByRole("alert")).toHaveTextContent("Sua sessão terminou. Entre de novo para cancelar o pedido.")
  })
})
