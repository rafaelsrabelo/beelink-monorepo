// Libs
import { describe, expect, it } from "vitest"

// Lib
import { metaPixelIdOf, metaTestCodeOf, metaTokenOf } from "./integrations"

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

describe("metaTokenOf and metaTestCodeOf (BEELINK-274)", () => {
  /** The API's own bounds (`MetaPixelTokenDto`): a form that took more would only be refused there. */
  it("takes a token of 20 to 1,000 visible characters, the white space around it dropped", () => {
    expect(metaTokenOf(`  EAAB${"x".repeat(40)}|-_\n`)).toBe(`EAAB${"x".repeat(40)}|-_`)
    expect(metaTokenOf("a".repeat(20))).toHaveLength(20)
    expect(metaTokenOf("a".repeat(1000))).toHaveLength(1000)
  })

  it("refuses what is plainly no token rather than cleaning it", () => {
    for (const typed of ["", "   ", "a".repeat(19), "a".repeat(1001), "um token com espaços no meio dele", `EAAB${"x".repeat(30)}é`, `EAAB${"x".repeat(30)}​`]) expect(metaTokenOf(typed)).toBeNull()
  })

  it("takes a test code of letters, digits, dashes and underscores, 3 to 40", () => {
    expect(metaTestCodeOf(" TEST12345 ")).toBe("TEST12345")
    expect(metaTestCodeOf("a_b-C")).toBe("a_b-C")
    for (const typed of ["", "ab", "x".repeat(41), "TEST 123", "TEST&x=1", "<b>"]) expect(metaTestCodeOf(typed)).toBeNull()
  })
})
