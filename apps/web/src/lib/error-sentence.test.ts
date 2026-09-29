// Libs
import { describe, expect, it } from "vitest"

// App
import { ptBR } from "@/locales/pt-BR"
import { errorSentenceOf } from "./error-sentence"

describe("an error code as a sentence", () => {
  it("reads the code's own sentence, and the generic one for any other word, however it is spelled", () => {
    expect(errorSentenceOf(ptBR.errors, "CUSTOMER_ADDRESS_NOT_FOUND")).toBe("Esse endereço não está mais na sua conta.")
    for (const word of ["NO_SUCH_CODE", "constructor", "toString", "__proto__"]) expect(errorSentenceOf(ptBR.errors, word)).toBe(ptBR.errors.UNKNOWN)
  })
})
