// Libs
import { describe, expect, it } from "vitest"

// Lib
import { metaPixelIdOf } from "./integrations"

describe("metaPixelIdOf (BEELINK-270)", () => {
  /** The API's own bounds (`META_PIXEL_ID`, `^[0-9]{10,20}$`): a form that took more would only be refused there. */
  it("takes 10 to 20 digits, and nothing shorter or longer", () => {
    expect(metaPixelIdOf("1234567890")).toBe("1234567890")
    expect(metaPixelIdOf("12345678901234567890")).toBe("12345678901234567890")
    expect(metaPixelIdOf("123456789")).toBeNull()
    expect(metaPixelIdOf("123456789012345678901")).toBeNull()
    expect(metaPixelIdOf("")).toBeNull()
  })

  it("drops the white space it was pasted with, wherever it is", () => {
    expect(metaPixelIdOf("  123456789012345\n")).toBe("123456789012345")
    expect(metaPixelIdOf("12345 67890 12345")).toBe("123456789012345")
    expect(metaPixelIdOf("\t123456789012345\r\n")).toBe("123456789012345")
    expect(metaPixelIdOf("   ")).toBeNull()
  })

  it("refuses anything else rather than cleaning it: a letter, a sign, a digit of another script, a whole snippet", () => {
    for (const typed of ["12345678901234a", "123456-789012345", "+123456789012345", "1234567890.5", "١٢٣٤٥٦٧٨٩٠١٢٣٤٥", "fbq('init', '123456789012345');", "ID: 123456789012345"]) expect(metaPixelIdOf(typed)).toBeNull()
  })
})
