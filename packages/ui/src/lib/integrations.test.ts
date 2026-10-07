// Libs
import { describe, expect, it } from "vitest"

// Lib
import { googleAnalyticsIdOf, metaPixelIdOf, metaTestCodeOf, metaTokenOf } from "./integrations"

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

describe("googleAnalyticsIdOf (BEELINK-302)", () => {
  /** The API's own bounds (`GOOGLE_ANALYTICS_ID`, `^G-[A-Z0-9]{6,16}$`): a form that took more would only be refused there. */
  it("takes G- and 6 to 16 capital letters or digits, and nothing shorter or longer", () => {
    expect(googleAnalyticsIdOf("G-AB12CD34EF")).toBe("G-AB12CD34EF")
    expect(googleAnalyticsIdOf("G-ABC123")).toBe("G-ABC123")
    expect(googleAnalyticsIdOf("G-ABCDEFGH12345678")).toBe("G-ABCDEFGH12345678")
    expect(googleAnalyticsIdOf("G-ABC12")).toBeNull()
    expect(googleAnalyticsIdOf("G-ABCDEFGH123456789")).toBeNull()
    expect(googleAnalyticsIdOf("")).toBeNull()
  })

  it("drops the white space an ID was pasted with, wherever it is", () => {
    expect(googleAnalyticsIdOf("  G-AB12CD34EF\n")).toBe("G-AB12CD34EF")
    expect(googleAnalyticsIdOf("G-AB12 CD34EF")).toBe("G-AB12CD34EF")
    expect(googleAnalyticsIdOf("\tG-AB12CD34EF\r\n")).toBe("G-AB12CD34EF")
    expect(googleAnalyticsIdOf("   ")).toBeNull()
  })

  /** Refused, never cleaned: another Google product's code, small letters or a snippet is not an ID with noise around it. */
  it("refuses another product's code, small letters, and anything around the ID", () => {
    for (const typed of ["UA-12345678-1", "GTM-AB12CD3", "AW-1234567890", "g-ab12cd34ef", "G-ab12cd34ef", "AB12CD34EF", "G_AB12CD34EF", "G-AB12-CD34", "G-ÁB12CD34EF", "gtag('config', 'G-AB12CD34EF');", "ID: G-AB12CD34EF"]) expect(googleAnalyticsIdOf(typed)).toBeNull()
  })
})
