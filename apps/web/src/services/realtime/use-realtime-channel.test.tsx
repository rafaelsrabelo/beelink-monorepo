// Libs
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { RealtimeTicketError } from "./realtime-requests"

type Handler = (...args: unknown[]) => void

/** The socket.io client, stood in for: it records what the hook asked of it and lets the test fire its events. */
const fake = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  options: null as null | { auth: (answer: (data: object) => void) => void; path: string },
  active: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock("socket.io-client", () => ({
  io: (_url: string, options: typeof fake.options) => {
    fake.options = options
    return {
      on: (event: string, handler: Handler) => fake.handlers.set(event, handler),
      connect: fake.connect,
      disconnect: fake.disconnect,
      get active() {
        return fake.active
      },
    }
  },
}))
vi.mock("@/lib/realtime-config", () => ({ REALTIME_URL: "http://api.test", REALTIME_PATH: "/api/socket.io", REALTIME_EVENT: "event" }))

const { useRealtimeChannel } = await import("./use-realtime-channel")

beforeEach(() => {
  fake.handlers.clear()
  fake.options = null
  fake.active = false
  fake.connect.mockReset()
  fake.disconnect.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

function mount(ticket: () => Promise<string>, enabled = true) {
  const onEvent = vi.fn()
  const onReconnect = vi.fn()
  const view = renderHook(() => useRealtimeChannel({ enabled, ticket, onEvent, onReconnect }))
  return { ...view, onEvent, onReconnect }
}

describe("useRealtimeChannel", () => {
  it("enters with a fresh ticket at the API's path, and hands each event over", async () => {
    const { onEvent } = mount(async () => "ticket-1")
    expect(fake.options?.path).toBe("/api/socket.io")

    const answer = vi.fn()
    fake.options!.auth(answer)
    await vi.waitFor(() => expect(answer).toHaveBeenCalledWith({ ticket: "ticket-1" }))

    act(() => fake.handlers.get("event")!({ type: "order.created", orderNumber: 3 }))
    expect(onEvent).toHaveBeenCalledWith({ type: "order.created", orderNumber: 3 })
  })

  /** What was said while the socket was away is lost: back, everything is read again — but not on the first connect. */
  it("reads everything again after a gap, and not on the first connect", () => {
    const { onReconnect } = mount(async () => "t")

    act(() => fake.handlers.get("connect")!())
    expect(onReconnect).not.toHaveBeenCalled()

    act(() => fake.handlers.get("disconnect")!())
    act(() => fake.handlers.get("connect")!())
    expect(onReconnect).toHaveBeenCalledOnce()
  })

  it("asks again after a refused ticket, waiting longer each time, and stops once the session ended", async () => {
    vi.useFakeTimers()
    mount(async () => "t")

    act(() => fake.handlers.get("connect_error")!(new Error("REALTIME_TICKET_INVALID")))
    vi.advanceTimersByTime(2_000)
    expect(fake.connect).toHaveBeenCalledTimes(1)
    act(() => fake.handlers.get("connect_error")!(new Error("REALTIME_TICKET_INVALID")))
    vi.advanceTimersByTime(2_000)
    expect(fake.connect).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2_000)
    expect(fake.connect).toHaveBeenCalledTimes(2)
  })

  it("stops asking once the ticket is refused for a session that ended", async () => {
    vi.useFakeTimers()
    mount(async () => {
      throw new RealtimeTicketError(401)
    })

    const answer = vi.fn()
    fake.options!.auth(answer)
    await vi.waitFor(() => expect(answer).toHaveBeenCalledWith({}))
    act(() => fake.handlers.get("connect_error")!(new Error("REALTIME_TICKET_INVALID")))
    vi.advanceTimersByTime(60_000)
    expect(fake.connect).not.toHaveBeenCalled()
  })

  it("opens nothing while off, and closes the socket when the page leaves", () => {
    mount(async () => "t", false)
    expect(fake.options).toBeNull()

    const { unmount } = mount(async () => "t")
    unmount()
    expect(fake.disconnect).toHaveBeenCalled()
  })
})
