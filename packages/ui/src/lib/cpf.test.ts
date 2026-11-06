// Libs
import { describe, expect, it } from "vitest"

// Lib
import { isCpf, maskCpf } from "./cpf"

describe("maskCpf", () => {
  it.each([
    ["", ""],
    ["5", "5"],
    ["529", "529"],
    ["5299", "529.9"],
    ["529982", "529.982"],
    ["5299822", "529.982.2"],
    ["529982247", "529.982.247"],
    ["5299822472", "529.982.247-2"],
    ["52998224725", "529.982.247-25"],
  ])("writes %j as %j while it is typed, and never ends in punctuation", (typed, shown) => {
    expect(maskCpf(typed)).toBe(shown)
  })

  it.each([
    ["52998224725", "529.982.247-25"],
    ["529.982.247-25", "529.982.247-25"],
    ["529 982 247 25", "529.982.247-25"],
    [" 529.982.247/25 ", "529.982.247-25"],
    ["CPF: 529.982.247-25", "529.982.247-25"],
  ])("reads %j pasted whole as %j", (pasted, shown) => {
    expect(maskCpf(pasted)).toBe(shown)
  })

  it("leaves out what is typed past the eleventh digit", () => {
    expect(maskCpf("529.982.247-259")).toBe("529.982.247-25")
    expect(maskCpf("5299822472599999")).toBe("529.982.247-25")
  })

  it("writes its own output again as it is", () => {
    for (const typed of ["5", "529.9", "529.982.2", "529.982.247-2", "529.982.247-25"]) expect(maskCpf(typed)).toBe(typed)
  })

  it("keeps nothing that is not a digit", () => {
    expect(maskCpf("abc")).toBe("")
    expect(maskCpf("5a2b9")).toBe("529")
  })
})

/** The cases of the API's own tests (`shared/http/cpf.spec.ts`, `dto/courier-application.dto.spec.ts`): the two must agree. */
describe("isCpf", () => {
  it.each(["52998224725", "529.982.247-25", " 529 982 247 25 ", "11144477735", "111.444.777-35"])("holds for %j, whose two check digits do", (typed) => {
    expect(isCpf(typed)).toBe(true)
  })

  it.each([
    ["a wrong check digit", "529.982.247-26"],
    ["the other check digit wrong", "52998224724"],
    ["one digit repeated", "111.111.111-11"],
    ["too short", "5299822472"],
    ["too long", "529982247250"],
    ["a CNPJ", "11.222.333/0001-81"],
    ["nothing", ""],
  ])("fails for %s", (_, typed) => {
    expect(isCpf(typed)).toBe(false)
  })
})
