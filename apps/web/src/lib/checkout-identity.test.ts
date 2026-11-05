// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"
import { messagesFor } from "@/locales"

// App
import { checkoutIdentityOf } from "./checkout-identity"

const errors = messagesFor("pt-BR").web.errors

describe("who is buying, as the cart's address left it", () => {
  it("is the form with nothing to say on a plain cart", () => {
    expect(checkoutIdentityOf({}, errors, ui)).toEqual({ step: "form", email: null, error: null, notice: null })
  })

  it("is the code step for the e-mail it went to, saying a new code went", () => {
    expect(checkoutIdentityOf({ codigo: "1", email: "bia@exemplo.com", reenviado: "1" }, errors, ui)).toEqual({
      step: "code",
      email: "bia@exemplo.com",
      error: null,
      notice: "Enviamos um novo código. Use o do e-mail mais recente.",
    })
  })

  it("is the form again without an e-mail to have sent a code to, and drops one too long to be one", () => {
    expect(checkoutIdentityOf({ codigo: "1" }, errors, ui).step).toBe("form")
    expect(checkoutIdentityOf({ codigo: "1", email: `${"a".repeat(250)}@x.co` }, errors, ui)).toMatchObject({ step: "form", email: null })
  })

  it("says a refusal in the shopper's words, and any word it does not know as the unknown one", () => {
    expect(checkoutIdentityOf({ "erro-dados": "CUSTOMER_CODE_INVALID", codigo: "1", email: "bia@exemplo.com" }, errors, ui).error).toBe(
      "Código errado ou vencido. Confira o e-mail mais recente ou peça outro.",
    )
    expect(checkoutIdentityOf({ "erro-dados": "constructor" }, errors, ui).error).toBe(errors.UNKNOWN)
  })
})
