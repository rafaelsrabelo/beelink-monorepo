// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

/** The module parses the environment as it loads, so each case loads it again. */
async function load(example: string | undefined, environment?: string, webDomain?: string, measurementId?: string) {
  vi.resetModules()
  if (example === undefined) vi.stubEnv("EXAMPLE_STORE_SLUG", undefined)
  else vi.stubEnv("EXAMPLE_STORE_SLUG", example)
  vi.stubEnv("APP_ENVIRONMENT", environment)
  vi.stubEnv("WEB_DOMAIN", webDomain)
  vi.stubEnv("SITE_GA_MEASUREMENT_ID", measurementId)

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

describe("serverEnv.APP_ENVIRONMENT", () => {
  /** Production sets nothing, and compose hands an unset variable over as "": both are the unmarked site. */
  it("is production unless a stack says otherwise", async () => {
    expect((await load(undefined)).APP_ENVIRONMENT).toBe("production")
    expect((await load(undefined, "")).APP_ENVIRONMENT).toBe("production")
  })

  it("takes homolog", async () => {
    expect((await load(undefined, "homolog")).APP_ENVIRONMENT).toBe("homolog")
  })

  // A typo that read as production would be a homologation site with no flag on it.
  it("refuses a name it does not know rather than guess which site this is", async () => {
    await expect(load(undefined, "staging")).rejects.toThrow(/Invalid environment/)
  })
})

describe("serverEnv.WEB_DOMAIN (BEELINK-283)", () => {
  /** Development and the e2e set none: every host is then looked up in the table of shop hosts. */
  it("is optional, and blank is unset — compose hands an unset variable over as blank", async () => {
    expect((await load(undefined, undefined, undefined)).WEB_DOMAIN).toBeUndefined()
    expect((await load(undefined, undefined, "")).WEB_DOMAIN).toBeUndefined()
  })

  it("takes the platform's host, as the stack names it for the API", async () => {
    expect((await load(undefined, undefined, "beelink.biz")).WEB_DOMAIN).toBe("beelink.biz")
    expect((await load(undefined, undefined, "localhost:3800")).WEB_DOMAIN).toBe("localhost:3800")
  })

  // A host is compared with the request's: an address would never match, and every request would be looked up.
  it("refuses an address, which the variable never was", async () => {
    await expect(load(undefined, undefined, "https://beelink.biz")).rejects.toThrow(/Invalid environment/)
    await expect(load(undefined, undefined, "beelink.biz/")).rejects.toThrow(/Invalid environment/)
  })
})

describe("serverEnv.SITE_GA_MEASUREMENT_ID (BEELINK-319)", () => {
  /** Development, the e2e of a shop and homologation set none: there the landing asks nothing. */
  it("is optional, and blank is unset — compose hands an unset variable over as blank", async () => {
    expect((await load(undefined, undefined, undefined, undefined)).SITE_GA_MEASUREMENT_ID).toBeUndefined()
    expect((await load(undefined, undefined, undefined, "")).SITE_GA_MEASUREMENT_ID).toBeUndefined()
  })

  it("takes a GA4 measurement ID, by the bounds the product takes a shop's", async () => {
    expect((await load(undefined, undefined, undefined, "G-TEST000000")).SITE_GA_MEASUREMENT_ID).toBe("G-TEST000000")
    expect((await load(undefined, undefined, undefined, "G-ABC123")).SITE_GA_MEASUREMENT_ID).toBe("G-ABC123")
  })

  // A value that read as "no ID" would be a landing that measures nothing, with nobody told why.
  it("refuses what is not one rather than start a site that silently measures nothing", async () => {
    for (const wrong of ["UA-12345-1", "GTM-ABC123", "g-test000000", "G-ABC12", " G-TEST000000", "G-TEST000000\n", "https://www.googletagmanager.com/gtag/js?id=G-TEST000000"]) {
      await expect(load(undefined, undefined, undefined, wrong), wrong).rejects.toThrow(/Invalid environment/)
    }
  })
})
