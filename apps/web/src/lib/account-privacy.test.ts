// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR } from "@/locales/pt-BR"
import { privacyActionsOf, privacyErrorOf } from "./account-privacy"

describe("the profile tab's privacy section", () => {
  it("says a wrong password left the account standing, and any other refusal in the shop's words", () => {
    expect(privacyErrorOf("AUTH_PASSWORD_WRONG", ptBR.errors, ui)).toBe("A senha não confere. Sua conta não foi excluída.")
    expect(privacyErrorOf("CUSTOMER_DELETE_EMAIL_MISMATCH", ptBR.errors, ui)).toBe("Esse não é o e-mail da conta. Sua conta não foi excluída.")
    expect(privacyErrorOf("constructor", ptBR.errors, ui)).toBe(ptBR.errors.UNKNOWN)
  })

  it("posts and links under the shop's own path, where the shopper's cookies reach", () => {
    expect(privacyActionsOf("loja")).toEqual({ data: "/loja/api/customer/meus-dados", delete: "/loja/api/customer/excluir-conta" })
  })
})
