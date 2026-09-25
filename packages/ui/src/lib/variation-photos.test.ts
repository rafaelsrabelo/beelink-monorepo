// Libs
import { describe, expect, it } from "vitest"

// Lib
import { canonicalPhotos, photosWithout, setPhotoValues } from "./variation-photos"
import { EMPTY_VARIATIONS } from "./variations"

describe("the photos' marks in the variations draft", () => {
  it("keeps one form, so undoing a mark gives back the same draft as text", () => {
    const loaded = { ...EMPTY_VARIATIONS, photos: canonicalPhotos([["/b.jpg", ["mor", "900"]], ["/a.jpg", ["choc"]]]) }
    const untickedAndTicked = setPhotoValues(setPhotoValues(loaded, "/b.jpg", ["900"]), "/b.jpg", ["900", "mor"])
    const clearedAndRemarked = setPhotoValues(setPhotoValues(loaded, "/a.jpg", []), "/a.jpg", ["choc"])

    expect(JSON.stringify(untickedAndTicked)).toBe(JSON.stringify(loaded))
    expect(JSON.stringify(clearedAndRemarked)).toBe(JSON.stringify(loaded))
  })

  it("stores no map when nothing is marked, as a draft that never had marks", () => {
    const marked = setPhotoValues(EMPTY_VARIATIONS, "/a.jpg", ["mor"])

    expect(JSON.stringify(setPhotoValues(marked, "/a.jpg", []))).toBe(JSON.stringify(EMPTY_VARIATIONS))
    expect(photosWithout(marked.photos, ["mor"])).toBeUndefined()
  })

  it("keeps a photo's other values when one is removed", () => {
    expect(photosWithout({ "/a.jpg": ["900", "mor"] }, ["mor"])).toEqual({ "/a.jpg": ["900"] })
  })
})
