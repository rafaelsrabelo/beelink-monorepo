// Libs
import { act, renderHook } from "@testing-library/react"
import type { MouseEvent } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { useLeaveGuard } from "./use-leave-guard"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

/** A click on "← Painel", as React hands it over. */
function click(modifiers: Partial<Pick<MouseEvent, "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "button">> = {}) {
  const anchor = document.createElement("a")
  anchor.setAttribute("href", "/admin/loja")
  const preventDefault = vi.fn()
  const event = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0, ...modifiers, currentTarget: anchor, preventDefault }
  return { event: event as unknown as MouseEvent<HTMLAnchorElement>, preventDefault }
}

afterEach(() => {
  push.mockReset()
  vi.restoreAllMocks()
})

describe("useLeaveGuard", () => {
  it("lets the way back through when nothing is waiting to be published", () => {
    const { result } = renderHook(() => useLeaveGuard(false))
    const { event, preventDefault } = click()

    act(() => result.current.onLeave(event))

    expect(preventDefault).not.toHaveBeenCalled()
    expect(result.current.asking).toBe(false)
  })

  it("stops the way back and asks when something is, then goes where it was going", () => {
    const { result } = renderHook(() => useLeaveGuard(true))
    const { event, preventDefault } = click()

    act(() => result.current.onLeave(event))
    expect(preventDefault).toHaveBeenCalled()
    expect(result.current.asking).toBe(true)

    act(() => result.current.leave())
    expect(push).toHaveBeenCalledWith("/admin/loja")
    expect(result.current.asking).toBe(false)
  })

  it("lets a click that opens another tab through: that is not leaving", () => {
    const { result } = renderHook(() => useLeaveGuard(true))

    for (const modifiers of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }]) {
      const { event, preventDefault } = click(modifiers)
      act(() => result.current.onLeave(event))
      expect(preventDefault).not.toHaveBeenCalled()
    }
    expect(result.current.asking).toBe(false)
  })

  it("asks on the browser's Back too, staying put, and goes back past its own step when told to", () => {
    const pushState = vi.spyOn(window.history, "pushState")
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined)
    const { result } = renderHook(() => useLeaveGuard(true))
    expect(pushState).toHaveBeenCalledTimes(1)

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(result.current.asking).toBe(true)
    // Back landed on the step; the step goes back on, so a second Back asks again.
    expect(pushState).toHaveBeenCalledTimes(2)

    act(() => result.current.leave())
    expect(go).toHaveBeenCalledWith(-2)
  })

  it("warns on closing the tab only while something is waiting", () => {
    const add = vi.spyOn(window, "addEventListener")
    const { rerender } = renderHook(({ changed }) => useLeaveGuard(changed), { initialProps: { changed: false } })
    expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(false)

    rerender({ changed: true })
    expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true)
  })
})
