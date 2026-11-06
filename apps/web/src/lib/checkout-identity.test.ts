// Libs
import { describe, expect, it } from "vitest"

// App
import { messagesFor } from "@/locales"
import { checkoutIdentityOf } from "./checkout-identity"

const errors = messagesFor("pt-BR").web.errors

describe("who is buying, as the cart's address left it", () => {
  it("is nothing to say on a plain cart", () => {
    expect(checkoutIdentityOf({}, errors)).toEqual({ email: null, error: null })
  })

  it("keeps the e-mail of a refused form, and drops one too long to be one", () => {
    expect(checkoutIdentityOf({ email: " bia@exemplo.com " }, errors).email).toBe("bia@exemplo.com")
    expect(checkoutIdentityOf({ email: `${"a".repeat(250)}@x.co` }, errors).email).toBeNull()
  })

  it("says a refusal in the visitor's words, and any word it does not know as the unknown one", () => {
    expect(checkoutIdentityOf({ "erro-dados": "CUSTOMER_PURCHASE_ENDED" }, errors).error).toBe("Os dados desta compra expiraram. Informe de novo para continuar: o carrinho continua aqui.")
    expect(checkoutIdentityOf({ "erro-dados": "constructor" }, errors).error).toBe(errors.UNKNOWN)
  })
})
