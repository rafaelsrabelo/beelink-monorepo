// Libs
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type BrowserContext, type Locator, type Page, type Response } from "@playwright/test"

// Support
import { standInForGoogle, type GoogleTraffic } from "./support/google-tag"

/**
 * The landing's courier form (BEELINK-322), in a real browser: what locks its button and what
 * unlocks it, the masks, the legal texts read over it, and a send that reaches the API. Since
 * BEELINK-329 it is the sign-up's first step — a name, a CPF, an e-mail, a WhatsApp and a vehicle,
 * with no city — on a yellow band.
 *
 * The suite's API takes far more applications from one address than a person sends
 * (`playwright.config.ts`): several tests here send for real. The answers a test cannot ask the API
 * for on demand — a refusal the browser's own check would have caught, the limit, a failure — are
 * stood in for at this app's own route.
 *
 * Everyone here is made up: CPFs whose check digits are right and that are nobody's, and addresses
 * at `exemplo.test`. Google is stood in for in every test, so none reaches it.
 */

const ROUTE = "**/api/courier-applications"
const ZULEICA = { name: "Zuleica Tavares", document: "52998224725", email: "zuleica.tavares@exemplo.test", whatsapp: "85987654321" }
const EVERYTHING = "Para continuar, falta: nome completo, CPF, e-mail, WhatsApp, aceite dos termos."

/** A CPF that checks out, from its first nine digits. */
function cpfOf(nine: string): string {
  const digit = (digits: string) => String(((([...digits].reduce((total, each, at) => total + Number(each) * (digits.length + 1 - at), 0) * 10) % 11) % 10))
  const first = digit(nine)

  return nine + first + digit(nine + first)
}

/**
 * A person nobody sent before, for a send that reaches the API (BEELINK-325): the list takes a CPF,
 * an e-mail and a WhatsApp once, and the suite's database outlives a test — and, on a desk, a run.
 * Digits alone, as a person types them.
 */
function someone(name = "Zuleica Tavares") {
  const nine = String(100_000_000 + Math.floor(Math.random() * 900_000_000))

  return { name, document: cpfOf(nine), email: `pessoa.${nine}@exemplo.test`, whatsapp: `859${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}` }
}

/** The two as the masks dress them, which is how they are sent. */
const dressedCpf = (digits: string) => digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
const dressedMobile = (digits: string) => digits.replace(/(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2 $3-$4")

/** Sentences of the two texts with no accent in them: a bundler may write an accent as an escape, and these are found either way. */
const A_SENTENCE_OF_THE_TERMS = "O bee-link pode mudar estes Termos"
const A_SENTENCE_OF_THE_POLICY = "Encarregado pelo tratamento de dados pessoais"

let google: GoogleTraffic

test.beforeEach(async ({ context }) => {
  google = await standInForGoogle(context)
})

const form = (page: Page) => page.getByRole("form", { name: "Dê o primeiro passo para entregar com a Beelink" })
const send = (page: Page) => form(page).getByRole("button", { name: /Continuar|Enviando|Tentar de novo/ })
const accept = (page: Page) => form(page).getByRole("checkbox")
const confirmation = (page: Page) => page.getByRole("group", { name: "Cadastro recebido." })
/** What stands where the form did when its CPF was on the list already (BEELINK-329). */
const alreadyThere = (page: Page) => page.getByRole("group", { name: "Esse CPF já tem cadastro." })
const field = (page: Page, label: string) => form(page).getByLabel(label, { exact: true })
/** A way of delivering, by its card: the radio inside is out of sight, and the card is what a person presses. */
const vehicle = (page: Page, name: string) => form(page).getByText(name, { exact: true })

/** The landing, once its script has run: a key pressed before that is lost. */
async function openLanding(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" })
  await form(page).scrollIntoViewIfNeeded()
}

/** Types as a person does, a key at a time: digits alone in the CPF and the WhatsApp, which the masks dress. */
async function fill(page: Page, who = ZULEICA) {
  await field(page, "Nome completo").pressSequentially(who.name)
  await field(page, "CPF").pressSequentially(who.document)
  await field(page, "E-mail").pressSequentially(who.email)
  await field(page, "WhatsApp").pressSequentially(who.whatsapp)
  await accept(page).check()
}

async function saidYes(context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([{ name: "bl_site_consent", value: "granted", url: baseURL! }])
}

const sentTo = (page: Page) => page.waitForResponse((response) => new URL(response.url()).pathname === "/api/courier-applications")

test.describe("the courier's form, its button", () => {
  test("is locked on an untouched form, and says what is missing in the sentence that describes it", async ({ page }) => {
    await openLanding(page)

    await expect(send(page)).toBeDisabled()
    await expect(send(page)).toHaveAccessibleDescription(EVERYTHING)
    await expect(form(page).getByText(EVERYTHING)).toBeVisible()
    await expect(form(page).getByText("Os documentos ficam para o próximo passo.")).toBeVisible()
  })

  /** BEELINK-329: the one city open is the section's to name, and the form does not ask for it. */
  test("asks for a name, a CPF, an e-mail, a WhatsApp and a vehicle — and no city — in a section that names Fortaleza", async ({ page }) => {
    await openLanding(page)

    await expect(form(page).getByRole("textbox")).toHaveCount(4)
    await expect(field(page, "E-mail")).toHaveAttribute("type", "email")
    await expect(form(page).locator("select")).toHaveCount(0)
    await expect(form(page).getByRole("radio")).toHaveCount(4)
    await expect(page.locator("#entregadores").getByText("Por enquanto, só em Fortaleza/CE.", { exact: false })).toBeVisible()
  })

  test("unlocks only once every field is right and the terms are accepted, the sentence shortening on the way, and locks again when one is undone", async ({ page }) => {
    await openLanding(page)

    await field(page, "Nome completo").pressSequentially(ZULEICA.name)
    await expect(send(page)).toHaveAccessibleDescription("Para continuar, falta: CPF, e-mail, WhatsApp, aceite dos termos.")
    await field(page, "CPF").pressSequentially(ZULEICA.document)
    await expect(send(page)).toHaveAccessibleDescription("Para continuar, falta: e-mail, WhatsApp, aceite dos termos.")
    await field(page, "E-mail").pressSequentially(ZULEICA.email)
    await field(page, "WhatsApp").pressSequentially(ZULEICA.whatsapp)
    await expect(send(page)).toHaveAccessibleDescription("Para continuar, falta: aceite dos termos.")
    await expect(send(page)).toBeDisabled()

    await accept(page).check()
    await expect(send(page)).toBeEnabled()
    await expect(form(page).getByText(/Para continuar, falta/)).toHaveCount(0)
    await expect(page.getByRole("status").filter({ hasText: "Tudo certo: o botão Continuar está liberado." })).toHaveCount(1)

    await accept(page).uncheck()
    await expect(send(page)).toBeDisabled()
    await accept(page).check()
    // The caret goes after the last digit by hand: a key pressed through the field's locator starts at its first character, with nothing to erase.
    await field(page, "CPF").evaluate((input: HTMLInputElement) => {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    })
    await page.keyboard.press("Backspace")
    await expect(send(page)).toBeDisabled()
    await expect(send(page)).toHaveAccessibleDescription("Para continuar, falta: CPF.")
  })

  test("shows a field's own refusal once the person leaves it, and not before", async ({ page }) => {
    await openLanding(page)

    await field(page, "CPF").pressSequentially("52998224726")
    await expect(form(page).getByText("Esse CPF não confere. Confira os números.")).toHaveCount(0)
    await field(page, "CPF").press("Tab")
    await expect(form(page).getByText("Esse CPF não confere. Confira os números.")).toBeVisible()
    await expect(field(page, "CPF")).toHaveAttribute("aria-invalid", "true")

    await field(page, "WhatsApp").pressSequentially("8532221111")
    await field(page, "WhatsApp").press("Tab")
    await expect(form(page).getByText("Informe um celular com DDD.")).toBeVisible()
  })

  /**
   * A refusal is written as its field is left, and the press that leaves it is often on what stands
   * below. Written on a line that was not there, it moved the checkbox and the links from under the
   * pointer before the button came up, and the click was lost. The button is held down here until the
   * refusal is on the page, as a person's press outlasts it.
   */
  test("takes a press made straight from a wrong field, on the acceptance and on a legal text: the refusal moves nothing below it", async ({ page, context, baseURL }) => {
    // No notice at the foot of the screen: the press is on what is under the pointer.
    await context.addCookies([{ name: "bl_site_consent", value: "denied", url: baseURL! }])
    const refusal = form(page).getByText("Informe um celular com DDD.")
    const pressFromWrongField = async (target: Locator) => {
      await page.goto("/", { waitUntil: "networkidle" })
      await field(page, "WhatsApp").pressSequentially("8532221111")
      await target.scrollIntoViewIfNeeded()
      const box = (await target.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await expect(refusal).toBeVisible()
      expect((await target.boundingBox())!.y).toBe(box.y)
      await page.mouse.up()
    }

    await pressFromWrongField(accept(page))
    await expect(accept(page)).toBeChecked()

    await pressFromWrongField(form(page).getByRole("link", { name: "termos de uso" }))
    await expect(page.getByRole("dialog", { name: "Termos de uso" })).toBeVisible()
  })

  /** Until the script arrives the browser would send the form by itself, and a GET writes every field into the address. */
  test("comes locked in the page as the server writes it, in a form the browser sends nowhere", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${baseURL}/`)

    await expect(send(page)).toBeDisabled()
    await expect(form(page)).toHaveAttribute("method", "dialog")
    await expect(form(page).getByText(EVERYTHING)).toBeVisible()
    await expect(form(page).getByRole("link", { name: "termos de uso" })).toHaveAttribute("href", "/termos")
    await expect(form(page).getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade")
    await field(page, "Nome completo").fill(ZULEICA.name)
    await field(page, "Nome completo").press("Enter")
    expect(page.url()).toBe(`${baseURL}/`)

    // With no script the two links are links: the text has a page of its own.
    await form(page).getByRole("link", { name: "termos de uso" }).click()
    await expect(page).toHaveURL(/\/termos$/)
    await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible()
    await context.close()
  })
})

test.describe("the courier's form, its masks", () => {
  test("dresses the CPF and the WhatsApp as they are typed, and takes no twelfth digit", async ({ page }) => {
    await openLanding(page)

    await field(page, "CPF").pressSequentially("5299822")
    await expect(field(page, "CPF")).toHaveValue("529.982.2")
    await field(page, "CPF").pressSequentially("47259")
    await expect(field(page, "CPF")).toHaveValue("529.982.247-25")

    await field(page, "WhatsApp").pressSequentially("859")
    await expect(field(page, "WhatsApp")).toHaveValue("(85) 9")
    await field(page, "WhatsApp").pressSequentially("876543217")
    await expect(field(page, "WhatsApp")).toHaveValue("(85) 9 8765-4321")
  })

  test("dresses them when they are pasted whole, the country's 55 taken off", async ({ page }) => {
    await openLanding(page)
    /** A paste, as the browser tells it: the text inserted at once. */
    const paste = async (label: string, text: string) => {
      await field(page, label).focus()
      await page.keyboard.insertText(text)
    }

    await paste("CPF", "52998224725")
    await expect(field(page, "CPF")).toHaveValue("529.982.247-25")
    await paste("WhatsApp", "+55 85 98765-4321")
    await expect(field(page, "WhatsApp")).toHaveValue("(85) 9 8765-4321")
  })

  test("keeps the caret where a digit is corrected in the middle", async ({ page }) => {
    await openLanding(page)
    await field(page, "CPF").pressSequentially("52998224725")

    // After "52": the 9 that follows is replaced by a 1.
    await field(page, "CPF").evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 2))
    await page.keyboard.press("Delete")
    await page.keyboard.type("1")

    await expect(field(page, "CPF")).toHaveValue("521.982.247-25")
    expect(await field(page, "CPF").evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(3)
  })
})

test.describe("the courier's form, sent", () => {
  test("reaches the API, which takes the application, and gives its place to a confirmation that takes the focus", async ({ page, baseURL }) => {
    const who = someone()
    await openLanding(page)
    await fill(page, who)
    await vehicle(page, "Bike").click()
    await expect(form(page).getByRole("radio", { name: "Bike" })).toBeChecked()

    const answer = sentTo(page)
    await send(page).click()
    const response: Response = await answer

    expect(response.status()).toBe(204)
    expect(response.request().postDataJSON()).toEqual({
      name: "Zuleica Tavares",
      document: dressedCpf(who.document),
      email: who.email,
      whatsapp: dressedMobile(who.whatsapp),
      city: "FORTALEZA_CE",
      vehicle: "BICYCLE",
      acceptedTerms: true,
      website: "",
    })
    await expect(confirmation(page)).toBeVisible()
    await expect(confirmation(page)).toBeFocused()
    await expect(confirmation(page).getByText("Em breve você recebe no seu e-mail as informações para concluir o cadastro.")).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: "Cadastro recebido. Em breve você recebe no seu e-mail" })).toHaveCount(1)
    await expect(form(page)).toHaveCount(0)
    // Nothing typed went to the address.
    expect(page.url()).toBe(`${baseURL}/`)
  })

  /**
   * A person is on the list once (BEELINK-325). A CPF already there is said where the confirmation
   * stands — "Esse CPF já tem cadastro", nothing kept and nothing to fix (BEELINK-329) — and an e-mail
   * or a WhatsApp there under another CPF on its own field, with the form kept.
   */
  test("says a CPF already on the list where the confirmation stands, an e-mail or a WhatsApp on its own field with the form kept, and takes one that is none of the three", async ({ page }) => {
    const first = someone()
    const second = someone("Raimundo Nonato")
    /** Types over what the field holds. */
    const retype = async (label: string, typed: string) => {
      await field(page, label).fill("")
      await field(page, label).pressSequentially(typed)
    }
    const refused = async (label: string, sentence: string) => {
      const answer = sentTo(page)
      await send(page).click()

      expect((await answer).status()).toBe(409)
      await expect(field(page, label)).toHaveAccessibleDescription(sentence)
      await expect(field(page, label)).toBeFocused()
      await expect(confirmation(page)).toHaveCount(0)
      await expect(alreadyThere(page)).toHaveCount(0)
      await expect(field(page, "Nome completo")).toHaveValue("Raimundo Nonato")
      await expect(accept(page)).toBeChecked()
    }

    await openLanding(page)
    await fill(page, first)
    await send(page).click()
    await expect(confirmation(page)).toBeVisible()

    await confirmation(page).getByRole("button", { name: "Enviar outro cadastro" }).click()
    await expect(field(page, "Nome completo")).toBeFocused()
    await expect(field(page, "CPF")).toHaveValue("")
    await expect(send(page)).toBeDisabled()

    // Another person, with the first one's CPF.
    await fill(page, { ...second, document: first.document })
    const taken = sentTo(page)
    await send(page).click()

    expect((await taken).status()).toBe(409)
    await expect(alreadyThere(page)).toBeVisible()
    await expect(alreadyThere(page)).toBeFocused()
    await expect(alreadyThere(page).getByText("Não precisa enviar de novo.", { exact: false })).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: "Esse CPF já tem cadastro." })).toHaveCount(1)
    await expect(form(page)).toHaveCount(0)
    await expect(confirmation(page)).toHaveCount(0)
    // In the section: the page has an alert of the framework's own, which announces a route.
    await expect(page.locator("#entregadores").getByRole("alert")).toHaveCount(0)

    // Their own CPF now, and the first one's e-mail: the form's to fix.
    await alreadyThere(page).getByRole("button", { name: "Cadastrar outro CPF" }).click()
    await expect(field(page, "Nome completo")).toBeFocused()
    await fill(page, { ...second, email: first.email })
    await refused("E-mail", "Este e-mail já está cadastrado.")

    await retype("E-mail", second.email)
    await retype("WhatsApp", first.whatsapp)
    await refused("WhatsApp", "Este WhatsApp já está cadastrado.")

    // Nothing of the first one's left: taken.
    await retype("WhatsApp", second.whatsapp)
    const answer = sentTo(page)
    await send(page).click()

    expect((await answer).status()).toBe(204)
    await expect(confirmation(page)).toBeVisible()
  })

  test("is filled in and sent with the keyboard alone", async ({ page }) => {
    const who = someone("Raimundo Nonato")
    await openLanding(page)

    await field(page, "Nome completo").focus()
    await page.keyboard.type(who.name)
    await page.keyboard.press("Tab")
    await page.keyboard.type(who.document)
    await page.keyboard.press("Tab")
    await page.keyboard.type(who.email)
    await page.keyboard.press("Tab")
    await page.keyboard.type(who.whatsapp)
    await page.keyboard.press("Tab")
    await expect(form(page).getByRole("radio", { name: "Moto" })).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(form(page).getByRole("radio", { name: "Carro" })).toBeChecked()
    await page.keyboard.press("Tab")
    await expect(accept(page)).toBeFocused()
    await page.keyboard.press("Space")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await expect(send(page)).toBeFocused()

    const answer = sentTo(page)
    await page.keyboard.press("Enter")

    const response = await answer
    expect(response.status()).toBe(204)
    expect(response.request().postDataJSON()).toMatchObject({ name: "Raimundo Nonato", document: dressedCpf(who.document), whatsapp: dressedMobile(who.whatsapp), vehicle: "CAR" })
    await expect(confirmation(page)).toBeFocused()
  })

  test("keeps its button disabled, with its own words, while the send is on its way", async ({ page }) => {
    let arrive = () => {}
    await page.route(ROUTE, async (route) => {
      await new Promise<void>((resolve) => (arrive = resolve))
      await route.fulfill({ status: 204 })
    })
    await openLanding(page)
    await fill(page)

    await send(page).click()

    await expect(send(page)).toHaveAccessibleName("Enviando…")
    await expect(send(page)).toBeDisabled()
    arrive()
    await expect(confirmation(page)).toBeVisible()
  })
})

test.describe("the courier's form, when the send meets a problem", () => {
  const refusal = (status: number, errorCode: string) => ({ status, contentType: "application/json", body: JSON.stringify({ statusCode: status, errorCode, message: "x" }) })
  const kept = async (page: Page) => {
    await expect(field(page, "Nome completo")).toHaveValue("Zuleica Tavares")
    await expect(field(page, "CPF")).toHaveValue("529.982.247-25")
    await expect(field(page, "E-mail")).toHaveValue("zuleica.tavares@exemplo.test")
    await expect(field(page, "WhatsApp")).toHaveValue("(85) 9 8765-4321")
    await expect(accept(page)).toBeChecked()
  }

  test("says the API's refusal on the field it is about, takes the person there and keeps the form", async ({ page }) => {
    await page.route(ROUTE, (route) => route.fulfill(refusal(400, "COURIER_DOCUMENT_INVALID")))
    await openLanding(page)
    await fill(page)

    await send(page).click()

    await expect(field(page, "CPF")).toHaveAccessibleDescription("Esse CPF não confere. Confira os números.")
    await expect(field(page, "CPF")).toBeFocused()
    await expect(confirmation(page)).toHaveCount(0)
    await kept(page)
  })

  test("says the limit in its own sentence and keeps the form", async ({ page }) => {
    await page.route(ROUTE, (route) => route.fulfill(refusal(429, "RATE_LIMITED")))
    await openLanding(page)
    await fill(page)

    await send(page).click()

    await expect(form(page).getByRole("alert")).toHaveText("Muitos envios em pouco tempo. Espere alguns minutos e tente de novo.")
    await expect(send(page)).toHaveAccessibleName("Continuar")
    await kept(page)
  })

  test("says a failure, keeps the form and sends the same application again when asked", async ({ page }) => {
    let fail = true
    await page.route(ROUTE, (route) => (fail ? route.abort("connectionfailed") : route.fulfill({ status: 204 })))
    await openLanding(page)
    await fill(page)

    await send(page).click()

    await expect(form(page).getByRole("alert")).toHaveText("Não foi possível enviar o cadastro agora. O que você preencheu continua aqui: tente de novo.")
    await kept(page)

    fail = false
    await form(page).getByRole("button", { name: "Tentar de novo" }).click()
    await expect(confirmation(page)).toBeVisible()
  })
})

test.describe("the courier's form, the two legal texts", () => {
  /** Every body the page was served up to here, as text: the document, its scripts, its data. */
  function served(page: Page) {
    const bodies: Promise<{ url: string; type: string; text: string }>[] = []
    page.on("response", (response) => {
      const type = response.request().resourceType()
      if (!["document", "script", "fetch", "xhr"].includes(type)) return
      bodies.push(
        response
          .text()
          .then((text) => ({ url: response.url(), type, text }))
          .catch(() => ({ url: response.url(), type, text: "" })),
      )
    })
    return async () => Promise.all(bodies)
  }

  test("are in neither the page nor the script it starts with: the text is asked for when its dialog opens, and not before", async ({ page }) => {
    const all = served(page)
    await openLanding(page)
    await fill(page)

    const before = await all()
    expect(before.filter((body) => body.type === "document")).toHaveLength(1)
    expect(before.filter((body) => body.type === "script").length).toBeGreaterThan(3)
    for (const sentence of [A_SENTENCE_OF_THE_TERMS, A_SENTENCE_OF_THE_POLICY]) {
      expect(before.filter((body) => body.text.includes(sentence)).map((body) => body.url)).toEqual([])
      expect(await page.content()).not.toContain(sentence)
    }

    await form(page).getByRole("link", { name: "termos de uso" }).click()
    const dialog = page.getByRole("dialog", { name: "Termos de uso" })
    await expect(dialog.getByText(A_SENTENCE_OF_THE_TERMS)).toBeVisible()

    // The same search finds it now, in what was asked for after the click: the search can see the text.
    const after = (await all()).slice(before.length)
    expect(after.filter((body) => body.text.includes(A_SENTENCE_OF_THE_TERMS)).length).toBeGreaterThan(0)
  })

  test("are read in a dialog over the form, which closes by Escape, by its button and by a press outside, each time giving the focus back to the link and keeping what was typed", async ({ page, baseURL }) => {
    await openLanding(page)
    await fill(page)
    const terms = form(page).getByRole("link", { name: "termos de uso" })
    const policy = form(page).getByRole("link", { name: "política de privacidade" })
    const kept = async () => {
      await expect(field(page, "Nome completo")).toHaveValue("Zuleica Tavares")
      await expect(field(page, "CPF")).toHaveValue("529.982.247-25")
      await expect(accept(page)).toBeChecked()
      await expect(send(page)).toBeEnabled()
      expect(page.url()).toBe(`${baseURL}/`)
    }

    await terms.click()
    const termsDialog = page.getByRole("dialog", { name: "Termos de uso" })
    await expect(termsDialog).toBeVisible()
    await expect(termsDialog).toHaveAccessibleDescription("Vigente desde 15 de outubro de 2026")
    await expect(termsDialog.getByRole("heading", { level: 3, name: "1. Quem somos" })).toBeVisible()
    await expect(termsDialog.getByRole("button", { name: "Fechar" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(termsDialog).toHaveCount(0)
    await expect(terms).toBeFocused()
    await kept()

    await policy.click()
    const policyDialog = page.getByRole("dialog", { name: "Política de privacidade" })
    await expect(policyDialog.getByRole("heading", { level: 3, name: /Dados de quem se candidata a entregar/ })).toBeAttached()
    await policyDialog.getByRole("button", { name: "Fechar" }).click()
    await expect(policyDialog).toHaveCount(0)
    await expect(policy).toBeFocused()
    await kept()

    await policy.click()
    await expect(policyDialog).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(policyDialog).toHaveCount(0)
    await expect(policy).toBeFocused()
    await kept()
  })

  test("hold the keyboard inside the dialog, whose text scrolls by the keys that scroll a page", async ({ page }) => {
    await openLanding(page)
    await form(page).getByRole("link", { name: "política de privacidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Política de privacidade" })
    await expect(dialog.getByRole("article")).toBeVisible()

    // Past its last stop the dialog takes the focus back on the next frame: sooner than a person's next key, later than a script's.
    for (let press = 0; press < 5; press += 1) {
      await page.keyboard.press("Tab")
      await expect.poll(() => dialog.evaluate((popup) => popup.contains(document.activeElement))).toBe(true)
    }
    // The close button is a stop of the keyboard too: the text is the one that is not a control.
    const text = dialog.locator("div[tabindex='0']")
    await text.focus()
    await page.keyboard.press("PageDown")
    await expect.poll(() => text.evaluate((region) => region.scrollTop)).toBeGreaterThan(100)
    // The page behind did not move for it.
    expect(await dialog.evaluate((popup) => popup.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true)
  })

  /**
   * What this page owes is to leave the click alone, and a tab opens only when it did. Whether that
   * tab then gets anywhere is the browser's: CI's headless one opened it and, more than once, never
   * finished loading it in twenty seconds. Where the link leads is its `href`.
   */
  test("leave a click with a modifier key to the browser: a new tab, and no dialog", async ({ page, context, baseURL }) => {
    await openLanding(page)
    const terms = form(page).getByRole("link", { name: "termos de uso" })
    await expect(terms).toHaveAttribute("href", "/termos")

    const opened = context.waitForEvent("page")
    await terms.click({ modifiers: ["ControlOrMeta"] })

    await opened
    await expect(page.getByRole("dialog")).toHaveCount(0)
    expect(page.url()).toBe(`${baseURL}/`)
  })

  test("are the texts the two pages show, in the version that names the courier's data", async ({ page }) => {
    await page.goto("/privacidade")

    await expect(page.getByText("Vigente desde 15 de outubro de 2026")).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: /Dados de quem se candidata a entregar/ })).toBeVisible()
    await expect(page.getByText("Se o formulário for enviado com um CPF, um e-mail ou um número de WhatsApp que já está na lista, o cadastro não é aceito", { exact: false })).toBeVisible()
  })
})

test.describe("the courier's form, measured", () => {
  const told = () => google.hits().map((hit) => `${hit.get("en")} @ ${hit.get("dl")}`)

  test("tells a lead to Beelink's Google Analytics once the application is taken, with nothing of the form in it", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)
    await openLanding(page)
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`])
    const who = someone()
    await fill(page, who)

    await send(page).click()

    await expect(confirmation(page)).toBeVisible()
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`, `generate_lead @ ${baseURL}/`])
    const everything = decodeURIComponent(google.requests.join("\n")).toLowerCase()
    for (const typed of ["Zuleica", "Tavares", who.document, dressedCpf(who.document), who.email, "exemplo.test", who.whatsapp, dressedMobile(who.whatsapp), "FORTALEZA", "MOTORCYCLE"]) {
      expect(everything).not.toContain(typed.toLowerCase())
    }
  })

  test("tells nothing of an application the API did not take", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)
    await page.route(ROUTE, (route) => route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }) }))
    await openLanding(page)
    await fill(page)

    await send(page).click()

    await expect(form(page).getByRole("alert")).toBeVisible()
    expect(told()).toEqual([`page_view @ ${baseURL}/`])
  })

  test("asks Google for nothing when the visitor gave no yes, sent or not", async ({ page }) => {
    await openLanding(page)
    await fill(page, someone())

    await send(page).click()

    await expect(confirmation(page)).toBeVisible()
    expect(google.requests).toEqual([])
  })
})

test.describe("the courier's form, to a reader and on a phone", () => {
  const audit = async (page: Page, include: string) =>
    (await new AxeBuilder({ page }).include(include).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((violation) => `${violation.id}: ${violation.help}`)

  // Contrast needs a real layout: here the form is on the section it was drawn for.
  test("has no accessibility violations: locked, refused on a field, unlocked, with a legal text open and taken", async ({ page }) => {
    await page.route(ROUTE, (route) => route.fulfill({ status: 204 }))
    await openLanding(page)
    expect(await audit(page, "#entregadores")).toEqual([])

    await field(page, "CPF").pressSequentially("52998224726")
    await field(page, "CPF").press("Tab")
    await expect(form(page).getByText("Esse CPF não confere. Confira os números.")).toBeVisible()
    expect(await audit(page, "#entregadores")).toEqual([])

    await field(page, "CPF").fill("")
    await fill(page)
    await expect(send(page)).toBeEnabled()
    expect(await audit(page, "#entregadores")).toEqual([])

    await form(page).getByRole("link", { name: "política de privacidade" }).click()
    await expect(page.getByRole("dialog").getByRole("article")).toBeVisible()
    expect(await audit(page, "[role='dialog']")).toEqual([])
    await page.keyboard.press("Escape")

    await send(page).click()
    await expect(confirmation(page)).toBeVisible()
    expect(await audit(page, "#entregadores")).toEqual([])
  })

  test.describe("at 390px", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("fits the screen: no sideways scroll with the form, its refusals or the dialog, which is never taller than the screen", async ({ page }) => {
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      await openLanding(page)
      expect(await overflow()).toBe(0)

      await field(page, "Nome completo").pressSequentially("Zuleica")
      await field(page, "Nome completo").press("Tab")
      await field(page, "CPF").pressSequentially("111")
      await field(page, "CPF").press("Tab")
      await expect(form(page).getByText("Esse CPF não confere. Confira os números.")).toBeVisible()
      expect(await overflow()).toBe(0)

      await form(page).getByRole("link", { name: "termos de uso" }).click()
      const dialog = page.getByRole("dialog", { name: "Termos de uso" })
      await expect(dialog.getByRole("article")).toBeVisible()
      const box = (await dialog.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(390)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(844)
      expect(await overflow()).toBe(0)
    })
  })
})
