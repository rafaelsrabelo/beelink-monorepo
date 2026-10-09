// Libs
import { describe, expect, it } from "vitest"

// Lib
import { customDomainRecordsOf } from "./custom-domain"

/** Documentation addresses (RFC 5737): nobody's servers. */
const FIRST = "203.0.113.10"
const SECOND = "203.0.113.11"

describe("customDomainRecordsOf (BEELINK-285)", () => {
  it("is an A on the root for the server's address, and www as a CNAME of the root", () => {
    expect(customDomainRecordsOf([FIRST])).toEqual([
      { type: "A", name: "@", value: FIRST },
      { type: "CNAME", name: "www", value: "@" },
    ])
  })

  /** The check wants the root's `A` records to be exactly the server's: one row for each, none left out. */
  it("has an A for each address the server answers on, in the order given, and one CNAME", () => {
    expect(customDomainRecordsOf([FIRST, SECOND])).toEqual([
      { type: "A", name: "@", value: FIRST },
      { type: "A", name: "@", value: SECOND },
      { type: "CNAME", name: "www", value: "@" },
    ])
  })
})
