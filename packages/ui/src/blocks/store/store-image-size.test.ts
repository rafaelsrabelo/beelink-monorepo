// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { readImageSize } from "./store-image-size"

const file = new File(["bytes"], "icone.png", { type: "image/png" })

describe("readImageSize", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("answers what the browser measured, and lets the bitmap go", async () => {
    const close = vi.fn()
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 512, height: 256, close })))

    expect(await readImageSize(file)).toEqual({ width: 512, height: 256 })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("answers no verdict where the browser cannot measure, or the file is no picture", async () => {
    vi.stubGlobal("createImageBitmap", undefined)
    expect(await readImageSize(file)).toBeNull()

    vi.stubGlobal("createImageBitmap", vi.fn(async () => Promise.reject(new Error("not an image"))))
    expect(await readImageSize(file)).toBeNull()
  })
})
