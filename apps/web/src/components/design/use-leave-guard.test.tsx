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

  // After "Criar página" the screen goes to the new page itself — asked the same question first.
  it("goes where the screen sends it, asking first only when something is waiting", () => {
    const clean = renderHook(() => useLeaveGuard(false))
    act(() => clean.result.current.go("/admin/loja/design?page=p1"))
    expect(push).toHaveBeenCalledWith("/admin/loja/design?page=p1")

    push.mockReset()
    const dirty = renderHook(() => useLeaveGuard(true))
    act(() => dirty.result.current.go("/admin/loja/design?page=p1"))
    expect(push).not.toHaveBeenCalled()
    expect(dirty.result.current.asking).toBe(true)
    act(() => dirty.result.current.leave())
    expect(push).toHaveBeenCalledWith("/admin/loja/design?page=p1")
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

  // Saved as they are made, changes come and go with each edit: Back must still leave in one press.
  it("steps the history once, however many saves come and go, and goes on back when nothing waits", () => {
    const pushState = vi.spyOn(window.history, "pushState")
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined)
    const { rerender, result } = renderHook(({ changed }) => useLeaveGuard(changed), { initialProps: { changed: true } })

    for (const changed of [false, true, false, true, false]) rerender({ changed })
    expect(pushState).toHaveBeenCalledTimes(1)

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(result.current.asking).toBe(false)
    expect(back).toHaveBeenCalledTimes(1)
  })

  it("warns on closing the tab only while something is waiting", () => {
    const add = vi.spyOn(window, "addEventListener")
    const { rerender } = renderHook(({ changed }) => useLeaveGuard(changed), { initialProps: { changed: false } })
    expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(false)

    rerender({ changed: true })
    expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true)
  })
})
