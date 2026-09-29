// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { securityFieldOf, securityNoticeOf } from "./account-security"

describe("the account's access, as the profile tab says it", () => {
  it("says what the last change did, and nothing for a word it does not know", () => {
    expect(securityNoticeOf("senha-trocada", "bia@exemplo.com", ptBR)).toBe("Pronto, sua senha foi trocada. Os outros aparelhos saíram da conta.")
    expect(securityNoticeOf("link-senha", "bia@exemplo.com", ptBR)).toBe("Enviamos para bia@exemplo.com um link para criar sua senha.")
    for (const word of [undefined, "", "endereco-salvo", "constructor"]) expect(securityNoticeOf(word, "bia@exemplo.com", ptBR)).toBeNull()
  })

  it("marks the field a refusal is about", () => {
    expect(securityFieldOf("AUTH_PASSWORD_WRONG")).toBe("atual")
    expect(securityFieldOf("CUSTOMER_PASSWORD_INVALID")).toBe("password")
    expect(securityFieldOf("CUSTOMER_PASSWORD_MISMATCH")).toBe("confirmacao")
    expect(securityFieldOf("RATE_LIMITED")).toBeNull()
  })
})
