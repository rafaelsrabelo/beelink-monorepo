// Libs
import { describe, expect, it } from "vitest"

// App
import { realtimeOriginOf } from "./realtime-config"

describe("the real-time socket's origin", () => {
  it("keeps only the origin, so a pasted path never becomes a namespace", () => {
    expect(realtimeOriginOf("https://loja.example/api")).toBe("https://loja.example")
    expect(realtimeOriginOf(" http://localhost:3001/ ")).toBe("http://localhost:3001")
  })

  it("stays shut when unset, blank or not a URL", () => {
    expect(realtimeOriginOf(undefined)).toBeNull()
    expect(realtimeOriginOf("  ")).toBeNull()
    expect(realtimeOriginOf("localhost:3001")).toBeNull()
  })
})
