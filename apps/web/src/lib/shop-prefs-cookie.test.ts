// Libs
import { describe, expect, it } from "vitest"

// App
import { cepFromCookies, shopPrefsCookieOf } from "./shop-prefs-cookie"

describe("shop-prefs-cookie", () => {
  it("reads the CEP kept, among the page's other cookies", () => {
    expect(cepFromCookies("bl_cart=abc.1; bl_shop=cep.01310930; bl_locale=pt-BR")).toBe("01310930")
  })

  it("reads none where there is none, or where it is not a CEP", () => {
    expect(cepFromCookies("bl_cart=abc.1")).toBeNull()
    expect(cepFromCookies("bl_shop=cep.0131")).toBeNull()
    expect(cepFromCookies("bl_shop=cep.<script>")).toBeNull()
  })

  it("keeps it on the shop's own path, for a year, secure where the page is", () => {
    expect(shopPrefsCookieOf("loja", "01310930", true)).toBe("bl_shop=cep.01310930;path=/loja;max-age=31536000;samesite=lax;secure")
    expect(shopPrefsCookieOf("loja", "01310930", false)).not.toContain("secure")
  })
})
