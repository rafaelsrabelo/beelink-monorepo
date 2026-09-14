// Libs
import { describe, expect, it } from "vitest"

// App
import { ptBR } from "@/locales/pt-BR"
import { en } from "@/locales/en"
import { AuthRequestError } from "@/services/auth/auth-requests"
import { errorCopy } from "./auth-error-copy"

describe("errorCopy", () => {
  it("says nothing when nothing failed", () => {
    expect(errorCopy(undefined, ptBR)).toBeUndefined()
    expect(errorCopy(null, ptBR)).toBeUndefined()
  })

  it("turns an API code into a sentence in the reader's language", () => {
    const error = new AuthRequestError("AUTH_INVALID_CREDENTIALS")

    expect(errorCopy(error, ptBR)).toBe("E-mail ou senha incorretos.")
    expect(errorCopy(error, en)).toBe("Wrong e-mail or password.")
  })

  it("never shows a reader a code it does not know", () => {
    expect(errorCopy(new AuthRequestError("SOMETHING_NEW"), ptBR)).toBe(ptBR.errors.UNKNOWN)
    expect(errorCopy(new Error("boom"), ptBR)).toBe(ptBR.errors.UNKNOWN)
  })
})
