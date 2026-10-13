// Libs
import { describe, expect, it } from "vitest"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { createCourierSchema, isCpf, isFullName, isMobile, LANDING_COURIER_FIELDS, missingCourierFields, type LandingCourierValues } from "./landing-courier-schema"

const text = ptBR.landing.couriers.form
const schema = createCourierSchema(text)

/** Made up: a CPF whose check digits are right and an address nobody owns. */
const valid = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  email: "zuleica.tavares@exemplo.test",
  whatsapp: "(85) 98765-4321",
  city: "FORTALEZA_CE",
  vehicle: "MOTORCYCLE",
  acceptedTerms: true,
  website: "",
} satisfies LandingCourierValues

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

describe("isMobile", () => {
  it.each(["(85) 98765-4321", "85987654321", "85 9 8765 4321", "+55 85 98765-4321", "5585987654321", "085 98765-4321", "(55) 99999-8888"])("holds for %j: an area code and nine digits that start with a 9", (typed) => {
    expect(isMobile(typed)).toBe(true)
  })

  it.each([
    ["a landline", "(85) 3222-1111"],
    ["a mobile with no area code", "98765-4321"],
    ["an area code with a zero in it", "(80) 98765-4321"],
    ["a number of another country", "+1 415 555 2671"],
    ["a mobile one digit short", "(85) 98765-432"],
    ["nothing", ""],
  ])("fails for %s", (_, typed) => {
    expect(isMobile(typed)).toBe(false)
  })
})

describe("isFullName", () => {
  it.each(["Zuleica Tavares", "  Zuleica   Tavares  ", "Ana de Sá", "João D'Ávila Neto"])("holds for %j: a first name and a surname", (typed) => {
    expect(isFullName(typed)).toBe(true)
  })

  it.each([
    ["a first name alone", "Zuleica"],
    ["only spaces", "   "],
    ["nothing", ""],
    ["more than 120 characters", `Zuleica ${"a".repeat(113)}`],
  ])("fails for %s", (_, typed) => {
    expect(isFullName(typed)).toBe(false)
  })

  it("takes exactly 120 characters, counted as the API keeps them", () => {
    expect(isFullName(`Zuleica ${"a".repeat(112)}`)).toBe(true)
    expect(isFullName(`  Zuleica    ${"a".repeat(112)}  `)).toBe(true)
  })
})

describe("the courier's schema", () => {
  it("takes a full name, a CPF, an e-mail, a mobile, the open city, a vehicle and the acceptance", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it("hands the e-mail over without the spaces around it", () => {
    const parsed = schema.parse({ ...valid, email: "  zuleica.tavares@exemplo.test " })

    expect(parsed.email).toBe("zuleica.tavares@exemplo.test")
  })

  it.each([
    ["a first name alone", { name: "Zuleica" }, "Informe o nome completo, com sobrenome."],
    ["a CPF with a wrong check digit", { document: "529.982.247-26" }, "Esse CPF não confere. Confira os números."],
    ["an e-mail with no domain", { email: "zuleica@" }, "Informe um e-mail válido."],
    ["an e-mail longer than an address may be", { email: `${"a".repeat(250)}@exemplo.test` }, "Informe um e-mail válido."],
    ["a landline", { whatsapp: "(85) 3222-1111" }, "Informe um celular com DDD."],
    ["no acceptance", { acceptedTerms: false }, "Marque o aceite para enviar."],
  ])("refuses %s with the field's own sentence", (_, change, sentence) => {
    const result = schema.safeParse({ ...valid, ...change })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([sentence])
  })

  it.each([
    ["a city that is not open", { city: "SAO_PAULO_SP" }],
    ["a vehicle the form does not offer", { vehicle: "SKATE" }],
  ])("refuses %s", (_, change) => {
    expect(schema.safeParse({ ...valid, ...change }).success).toBe(false)
  })

  /** The dictionary's cities are the list: a language that named another would offer it, so both name the same ones. */
  it("offers the cities the dictionary names, the same in every language", () => {
    expect(Object.keys(text.cities)).toEqual(["FORTALEZA_CE"])
    expect(Object.keys(en.landing.couriers.form.cities)).toEqual(Object.keys(text.cities))
  })
})

describe("missingCourierFields", () => {
  it("is empty for a form with nothing left to fix", () => {
    expect(missingCourierFields(schema, valid)).toEqual([])
  })

  it("names what an untouched form lacks, in the order the form asks: the city and the vehicle are already chosen", () => {
    expect(missingCourierFields(schema, { name: "", document: "", email: "", whatsapp: "", city: "FORTALEZA_CE", vehicle: "MOTORCYCLE", acceptedTerms: false, website: "" })).toEqual(["name", "document", "email", "whatsapp", "acceptedTerms"])
  })

  it("names a field filled in wrongly like one left empty, once each", () => {
    expect(missingCourierFields(schema, { ...valid, document: "111.111.111-11", email: "zuleica" })).toEqual(["document", "email"])
  })

  it("names every field a form with nothing in it lacks", () => {
    expect(missingCourierFields(schema, {})).toEqual([...LANDING_COURIER_FIELDS])
  })

  it("has a name to say for every field, in every language", () => {
    for (const dictionary of [text, en.landing.couriers.form]) expect(Object.keys(dictionary.missingNames).sort()).toEqual([...LANDING_COURIER_FIELDS].sort())
  })
})
