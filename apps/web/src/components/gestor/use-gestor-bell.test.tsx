// Libs
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { RING_EVERY_MS, useGestorBell } from "./use-gestor-bell"
import { useWakeLock } from "./use-wake-lock"

const bell = vi.hoisted(() => ({ ring: vi.fn(), unlock: vi.fn(() => Promise.resolve()) }))
vi.mock("@/lib/gestor-bell", () => ({ createGestorBell: () => bell }))

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("the manager's bell", () => {
  it("rings at once and again on its clock while an order waits, and stops when none does", () => {
    const { rerender } = renderHook(({ ringing }) => useGestorBell(ringing), { initialProps: { ringing: true } })
    expect(bell.ring).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(RING_EVERY_MS * 2))
    expect(bell.ring).toHaveBeenCalledTimes(3)

    rerender({ ringing: false })
    act(() => void vi.advanceTimersByTime(RING_EVERY_MS * 3))
    expect(bell.ring).toHaveBeenCalledTimes(3)
  })

  it("stays silent with nothing waiting, and plays once to be tested", async () => {
    const { result } = renderHook(() => useGestorBell(false))
    expect(bell.ring).not.toHaveBeenCalled()
    await act(async () => result.current.test())
    expect(bell.unlock).toHaveBeenCalled()
    expect(bell.ring).toHaveBeenCalledTimes(1)
  })
})

describe("the screen kept on", () => {
  it("asks for the lock while open, again on the way back to the tab, and lets it go", async () => {
    const release = vi.fn(() => Promise.resolve())
    const request = vi.fn(() => Promise.resolve({ release }))
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true })

    const { unmount } = renderHook(() => useWakeLock(true))
    await act(async () => undefined)
    expect(request).toHaveBeenCalledWith("screen")

    await act(async () => void document.dispatchEvent(new Event("visibilitychange")))
    expect(request).toHaveBeenCalledTimes(2)

    unmount()
    expect(release).toHaveBeenCalled()
    Reflect.deleteProperty(navigator, "wakeLock")
  })

  it("asks for nothing before the counter is opened", () => {
    const request = vi.fn()
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true })
    renderHook(() => useWakeLock(false))
    expect(request).not.toHaveBeenCalled()
    Reflect.deleteProperty(navigator, "wakeLock")
  })
})
