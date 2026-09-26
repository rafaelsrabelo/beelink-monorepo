// Libs
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Hook
import { useLatest } from "./use-latest"

describe("useLatest", () => {
  it("holds the value of the latest render, not the one it started with", () => {
    const { result, rerender } = renderHook(({ value }) => useLatest(value), { initialProps: { value: "quando escolheu" } })
    const ref = result.current

    rerender({ value: "agora" })

    expect(ref.current).toBe("agora")
  })
})
