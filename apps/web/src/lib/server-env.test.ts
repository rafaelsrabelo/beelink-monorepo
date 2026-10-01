// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

/** The module parses the environment as it loads, so each case loads it again. */
async function load(example: string | undefined) {
  vi.resetModules()
  if (example === undefined) vi.stubEnv("EXAMPLE_STORE_SLUG", undefined)
  else vi.stubEnv("EXAMPLE_STORE_SLUG", example)

  return (await import("./server-env")).serverEnv
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("serverEnv.EXAMPLE_STORE_SLUG", () => {
  it("is optional: unset, the landing offers no example shop", async () => {
    expect((await load(undefined)).EXAMPLE_STORE_SLUG).toBeUndefined()
  })

  /** `.env.example` ships the line blank, and compose passes an unset variable as "": neither may stop the web from starting. */
  it("reads a blank value as unset rather than refusing to start", async () => {
    expect((await load("")).EXAMPLE_STORE_SLUG).toBeUndefined()
  })

  it("takes a slug", async () => {
    expect((await load("loja-exemplo")).EXAMPLE_STORE_SLUG).toBe("loja-exemplo")
  })

  it("refuses what could not be a shop's address, since it becomes a link", async () => {
    await expect(load("../admin")).rejects.toThrow(/Invalid environment/)
  })
})
