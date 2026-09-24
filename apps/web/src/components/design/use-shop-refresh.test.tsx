// Libs
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// App
import { useShopRefresh } from "./use-shop-refresh"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

describe("useShopRefresh", () => {
  // Back from the tab a notice opened: the shop may have changed there, and design mode reads it anew.
  it("takes the shop's read again when the tab comes back, without drawing any showcase as loading", () => {
    const { result } = renderHook(() => useShopRefresh())
    refresh.mockClear()
    const visibility = vi.spyOn(document, "visibilityState", "get")

    visibility.mockReturnValue("hidden")
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    expect(refresh).not.toHaveBeenCalled()

    visibility.mockReturnValue("visible")
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(result.current.refreshingId).toBeNull()
    visibility.mockRestore()
  })
})
