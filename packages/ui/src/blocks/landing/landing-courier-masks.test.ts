// Libs
import { describe, expect, it } from "vitest"

// Block
import { maskCpf, maskField, maskMobile } from "./landing-courier-masks"

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

describe("maskMobile", () => {
  it.each([
    ["", ""],
    ["8", "(8"],
    ["85", "(85"],
    ["859", "(85) 9"],
    ["8598888", "(85) 98888"],
    ["85988887", "(85) 98888-7"],
    ["85988887777", "(85) 98888-7777"],
  ])("writes %j as %j while it is typed, and never ends in punctuation", (typed, shown) => {
    expect(maskMobile(typed)).toBe(shown)
  })

  it.each([
    ["85988887777", "(85) 98888-7777"],
    ["(85) 98888-7777", "(85) 98888-7777"],
    ["85 9 8888 7777", "(85) 98888-7777"],
    ["+55 85 98888-7777", "(85) 98888-7777"],
    ["+55 (85) 9 8888-7777", "(85) 98888-7777"],
    ["5585988887777", "(85) 98888-7777"],
    ["55 85 98888-7777", "(85) 98888-7777"],
    ["085 98888-7777", "(85) 98888-7777"],
    ["+55 085 98888-7777", "(85) 98888-7777"],
  ])("reads %j pasted whole as %j: the country's 55 and the trunk's 0 are not the number", (pasted, shown) => {
    expect(maskMobile(pasted)).toBe(shown)
  })

  /** 55 is Santa Maria's area code: a twelfth key pressed by mistake must not make it another number. */
  it("never takes an area code of 55 for the country's, typed a digit at a time", () => {
    expect(maskMobile("55999998888")).toBe("(55) 99999-8888")
    expect(maskMobile("(55) 99999-88881")).toBe("(55) 99999-8888")
    expect(maskMobile("5599999")).toBe("(55) 99999")
  })

  it("leaves out what is typed past the eleventh digit", () => {
    expect(maskMobile("(85) 98888-77779")).toBe("(85) 98888-7777")
  })

  it("writes its own output again as it is", () => {
    for (const typed of ["(8", "(85", "(85) 9", "(85) 98888", "(85) 98888-7", "(85) 98888-7777"]) expect(maskMobile(typed)).toBe(typed)
  })

  /** A landline is not refused here — the field's check does that — but it is not dressed as a mobile either. */
  it("writes a landline's ten digits in the mobile's shape, one short", () => {
    expect(maskMobile("8533334444")).toBe("(85) 33334-444")
  })
})

describe("maskField", () => {
  function field(value: string, caret: number) {
    const input = document.createElement("input")
    document.body.append(input)
    input.focus()
    input.value = value
    input.setSelectionRange(caret, caret)
    return input
  }

  it("keeps the caret at the end while a value is typed", () => {
    const cpf = field("5299", 4)

    maskField(cpf, maskCpf)

    expect(cpf.value).toBe("529.9")
    expect(cpf.selectionStart).toBe(5)
  })

  /** "529.982.247-25" with a 1 typed after "52": the caret stays after the 1, not at the end. */
  it("keeps the caret after the digit just typed in the middle", () => {
    const cpf = field("5219.982.247-25", 3)

    maskField(cpf, maskCpf)

    expect(cpf.value).toBe("521.998.224-72")
    expect(cpf.selectionStart).toBe(3)
    expect(cpf.selectionEnd).toBe(3)
  })

  it("puts the caret past the punctuation the mask wrote before the digit just typed", () => {
    const phone = field("(859", 4)

    maskField(phone, maskMobile)

    expect(phone.value).toBe("(85) 9")
    expect(phone.selectionStart).toBe(6)
  })

  it("leaves the caret at the end of a value pasted whole, country code and all", () => {
    const pasted = "+55 85 98888-7777"
    const phone = field(pasted, pasted.length)

    maskField(phone, maskMobile)

    expect(phone.value).toBe("(85) 98888-7777")
    expect(phone.selectionStart).toBe(15)
  })

  /** A field the browser fills in is not the one in use: selecting inside it would move the focus. */
  it("writes the mask and selects nothing in a field that does not have the focus", () => {
    const cpf = field("52998224725", 0)
    const other = field("", 0)
    expect(document.activeElement).toBe(other)

    maskField(cpf, maskCpf)

    expect(cpf.value).toBe("529.982.247-25")
    expect(document.activeElement).toBe(other)
  })
})
