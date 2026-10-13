// Libs
import { describe, expect, it } from "vitest"

// App
import { siteAnalyticsIdFor, sitePageOf } from "./site-analytics"

const ID = "G-TEST000000"
const SITE = "https://beelink.example"

/** BEELINK-320: the ID reaches the browser of a visitor who said yes, and of no other. */
describe("siteAnalyticsIdFor", () => {
  it("hands the ID over for a yes the server read", () => {
    expect(siteAnalyticsIdFor(ID, "granted")).toBe(ID)
  })

  it("hands nothing over to a visitor who refused or was never asked", () => {
    expect(siteAnalyticsIdFor(ID, "denied")).toBeNull()
    expect(siteAnalyticsIdFor(ID, null)).toBeNull()
  })

  it("hands nothing over where no ID is configured, whatever a cookie left from when there was one says", () => {
    expect(siteAnalyticsIdFor(undefined, "granted")).toBeNull()
    expect(siteAnalyticsIdFor("", "granted")).toBeNull()
  })
})

/** BEELINK-320: no event carries an address with a parameter that says who somebody is. */
describe("sitePageOf", () => {
  it("tells a page as its origin and path", () => {
    expect(sitePageOf(`${SITE}/`, "", "")).toEqual({ page_location: `${SITE}/` })
    expect(sitePageOf(`${SITE}/signup`, "", "Criar conta")).toEqual({ page_location: `${SITE}/signup`, page_title: "Criar conta" })
  })

  it("keeps the campaign's labels, in one order, and nothing else of the address", () => {
    const href = `${SITE}/?utm_medium=cpc&fbclid=IwAR0abc&utm_source=instagram&gclid=Cj0abc&utm_campaign=lan%C3%A7amento&ref=joao#planos`

    expect(sitePageOf(href, "", "").page_location).toBe(`${SITE}/?utm_source=instagram&utm_medium=cpc&utm_campaign=lan%C3%A7amento`)
  })

  // What the sign-in is sent to with: the panel page to go back to names a shop, and an order.
  it("leaves out where the sign-in leads back to, and any token, e-mail or code an address brought", () => {
    for (const query of ["voltar=%2Fadmin%2Floja-da-ana%2Forders%2F1042", "token=abc.def.ghi", "email=ana%40exemplo.com", "code=4%2F0Adeu5B", "cpf=12345678909&telefone=11999998888"]) {
      expect(sitePageOf(`${SITE}/login?${query}`, "", "").page_location).toBe(`${SITE}/login`)
    }
  })

  it("drops a label that holds an address or runs past a label's length", () => {
    const long = "x".repeat(81)

    expect(sitePageOf(`${SITE}/?utm_source=news&utm_content=ana%40exemplo.com&utm_term=${long}`, "", "").page_location).toBe(`${SITE}/?utm_source=news`)
    expect(sitePageOf(`${SITE}/?utm_source=`, "", "").page_location).toBe(`${SITE}/`)
  })

  it("tells another site the visitor came from by its origin and path, with no parameter", () => {
    expect(sitePageOf(`${SITE}/`, "https://www.google.com/search?q=loja+online#top", "").page_referrer).toBe("https://www.google.com/search")
    expect(sitePageOf(`${SITE}/`, "https://www.instagram.com/", "").page_referrer).toBe("https://www.instagram.com/")
  })

  // A link with a token, a shop's page, the panel: none of them is named to Google as the page before this one.
  it("tells its own site as the origin alone, whatever page of it the visitor came from", () => {
    for (const from of ["/verify-email?token=abc.def.ghi", "/reset-password?token=abc", "/loja-da-ana/pedidos/1042", "/admin/loja-da-ana/customers/77", "/signup"]) {
      expect(sitePageOf(`${SITE}/login`, `${SITE}${from}`, "").page_referrer).toBe(`${SITE}/`)
    }
  })

  it("tells no arrival where the browser gave none, or gave something that is no address", () => {
    expect(sitePageOf(`${SITE}/`, "", "")).not.toHaveProperty("page_referrer")
    for (const referrer of ["about:blank", "android-app://com.google.android.gm/", "não é um endereço"]) {
      expect(sitePageOf(`${SITE}/`, referrer, "")).not.toHaveProperty("page_referrer")
    }
  })
})
