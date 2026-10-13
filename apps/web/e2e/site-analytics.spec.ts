// Libs
import { expect, test, type BrowserContext, type Page } from "@playwright/test"

// Support
import { standInForGoogle, type GoogleTraffic } from "./support/google-tag"

/**
 * Beelink's own Google Analytics (BEELINK-320), in a real browser: what a page asks of Google, when,
 * and with what in it. Nothing here reaches Google — `standInForGoogle` answers for it, with a
 * library written from Google's documentation, and the list of what the page asked for is the proof.
 * What Google's own library does with the same calls, no test here has seen.
 *
 * The suite's web is started with the made-up measurement ID below (`playwright.config.ts`). The
 * sign-up's answer is stood in for too: this is about the event, and `auth-journey.spec.ts` holds
 * the sign-up itself.
 */

const ID = "G-TEST000000"
const SCRIPT = `https://www.googletagmanager.com/gtag/js?id=${ID}`
const ANA = { name: "Ana Souza", email: "ana.souza@exemplo.test", password: "uma-senha-bem-comprida" }

let google: GoogleTraffic

test.beforeEach(async ({ context }) => {
  google = await standInForGoogle(context)
})

const notice = (page: Page) => page.getByRole("region", { name: "Cookies de medição" })

/** A visitor who already said yes on the landing, as the browser holds it. */
async function saidYes(context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([{ name: "bl_site_consent", value: "granted", url: baseURL! }])
}

/** The page, once its script has run: a click before that is lost. */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" })
}

async function googleCookies(page: Page): Promise<string[]> {
  return (await page.context().cookies())
    .map((cookie) => cookie.name)
    .filter((name) => name === "_ga" || name.startsWith("_ga_"))
    .sort()
}

/** Every event reported, in order, as `name @ the page told` — and whether it was one the library sent of its own accord. */
const told = () => google.hits().map((hit) => `${hit.get("en")} @ ${hit.get("dl")}${hit.has("standin_own") ? " (the library's own)" : ""}`)

const lockOf = (page: Page) => page.evaluate((key) => (window as unknown as Record<string, unknown>)[key], `ga-disable-${ID}`)

test.describe("Beelink's own Google Analytics, without a yes", () => {
  test("asks Google for nothing and holds none of its cookies, before an answer and after a no", async ({ page }) => {
    for (const path of ["/", "/login", "/signup"]) await open(page, path)

    await open(page, "/")
    await notice(page).getByRole("button", { name: "Recusar" }).click()
    await expect(notice(page)).toHaveCount(0)
    await page.reload({ waitUntil: "networkidle" })
    for (const path of ["/login", "/signup"]) await open(page, path)

    expect(google.requests).toEqual([])
    expect(await googleCookies(page)).toEqual([])
  })

  test("keeps the measurement ID from a browser that did not say yes, and from every page that is not measured", async ({ request }) => {
    const pageFor = async (path: string, cookie: string) => (await request.get(path, { headers: { cookie }, maxRedirects: 0 })).text()

    for (const path of ["/", "/login", "/signup"]) {
      expect(await pageFor(path, ""), `${path}, never asked`).not.toContain(ID)
      expect(await pageFor(path, "bl_site_consent=denied"), `${path}, refused`).not.toContain(ID)
      expect(await pageFor(path, "bl_consent=granted"), `${path}, a shop's yes`).not.toContain(ID)
      expect(await pageFor(path, "bl_site_consent=granted"), `${path}, accepted`).toContain(SCRIPT)
    }
    for (const path of ["/forgot-password", "/verify-email", "/reset-password", "/privacidade", "/termos", "/uma-loja-qualquer", "/admin/uma-loja"]) {
      expect(await pageFor(path, "bl_site_consent=granted"), `${path}, accepted`).not.toContain(ID)
    }
  })
})

test.describe("Beelink's own Google Analytics, with a yes", () => {
  test("at a yes given on the page, asks for the script once with the configured ID and tells the page to it, with no reload", async ({ page, baseURL }) => {
    await open(page, "/")
    await page.evaluate(() => (document.documentElement.dataset.loaded = "once"))

    await notice(page).getByRole("button", { name: "Aceitar" }).click()

    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`])
    expect(google.scripts()).toEqual([SCRIPT])
    expect(google.hits()[0].get("tid")).toBe(ID)
    // Measurement granted, and nothing else: the stand-in reports consent the way Google's does.
    expect(google.hits()[0].get("gcs")).toBe("G101")
    expect(await googleCookies(page)).toEqual(["_ga", "_ga_TEST000000"])

    // The same document: the answer is still said aloud, and nothing was loaded again.
    await expect(page.locator("html")).toHaveAttribute("data-loaded", "once")
    await expect(page.getByRole("status").filter({ hasText: "Escolha salva: você aceitou os cookies de medição da Beelink." })).toHaveCount(1)
  })

  test("counts one more view at each measured page a visitor moves to, with no reload and no second script", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)
    await open(page, "/")
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`])
    await page.evaluate(() => (document.documentElement.dataset.loaded = "once"))

    await page.getByRole("link", { name: "Começar agora" }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`, `page_view @ ${baseURL}/signup`])

    await page.getByRole("link", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/login$/)
    // One each, and none of the library's own: it was shut while the address changed.
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`, `page_view @ ${baseURL}/signup`, `page_view @ ${baseURL}/login`])

    await expect(page.locator("html")).toHaveAttribute("data-loaded", "once")
    expect(google.scripts()).toEqual([SCRIPT])
    expect(google.hits().map((hit) => hit.get("tid"))).toEqual([ID, ID, ID])
  })

  test("tells a page without the parameters its address brought, but for a campaign's labels", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)

    await open(page, "/?utm_source=instagram&fbclid=IwAR0abc&utm_campaign=lancamento#planos")
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/?utm_source=instagram&utm_campaign=lancamento`])

    // A signed-out visit to the panel lands on the sign-in, whose address says where to go back to.
    await open(page, "/admin/loja-da-ana/orders")
    await expect(page).toHaveURL(/\/login\?voltar=/)
    await expect.poll(told).toHaveLength(2)
    expect(told()[1]).toBe(`page_view @ ${baseURL}/login`)

    expect(decodeURIComponent(google.requests.join("\n"))).not.toMatch(/fbclid|IwAR0abc|voltar|loja-da-ana|planos/)
  })

  test("tells an account created, and nothing of who created it", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)
    await page.route("**/api/auth/register", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "u-1", name: ANA.name, email: ANA.email }) }))
    await open(page, "/signup")

    await page.getByLabel("Nome").fill(ANA.name)
    await page.getByLabel("E-mail").fill(ANA.email)
    await page.getByLabel("Senha").fill(ANA.password)
    await page.getByRole("button", { name: "Criar conta" }).click()
    await expect(page.getByText("Confira seu e-mail")).toBeVisible()

    await expect.poll(told).toEqual([`page_view @ ${baseURL}/signup`, `sign_up @ ${baseURL}/signup`])
    expect(google.hits()[1].get("tid")).toBe(ID)

    const asked = decodeURIComponent(google.requests.join("\n"))
    for (const theirs of ["Ana", "Souza", "ana.souza", "exemplo.test", ANA.password]) expect(asked).not.toContain(theirs)
  })
})

test.describe("Beelink's own Google Analytics, once the page is left or the yes taken back", () => {
  test("tells nothing of the page a visitor leaves for, by a link or by the browser's own buttons", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)
    await open(page, "/login")
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/login`])

    await page.getByRole("link", { name: "Esqueceu a senha?" }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await page.waitForLoadState("networkidle")
    expect(await lockOf(page)).toBe(true)

    await page.goBack()
    await expect(page).toHaveURL(/\/login$/)
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/login`, `page_view @ ${baseURL}/login`])
    expect(await lockOf(page)).toBe(false)

    await page.goForward()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await page.waitForLoadState("networkidle")

    expect(told()).toEqual([`page_view @ ${baseURL}/login`, `page_view @ ${baseURL}/login`])
    expect(google.requests.filter((url) => url.includes("forgot-password"))).toEqual([])
    expect(google.scripts()).toEqual([SCRIPT])
  })

  test("at a yes taken back, stops at once and takes Google's cookies out", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)
    await open(page, "/")
    await expect.poll(told).toEqual([`page_view @ ${baseURL}/`])
    expect(await googleCookies(page)).toEqual(["_ga", "_ga_TEST000000"])

    await page.getByRole("button", { name: "Cookies" }).click()
    await notice(page).getByRole("button", { name: "Recusar" }).click()
    await expect(notice(page)).toHaveCount(0)

    await expect.poll(() => googleCookies(page)).toEqual([])
    expect(await lockOf(page)).toBe(true)

    // The library is still in the tab. Whatever the visitor does next, it reports nothing and writes nothing.
    await page.getByRole("link", { name: "Começar agora" }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await page.waitForLoadState("networkidle")
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await page.waitForLoadState("networkidle")

    expect(told()).toEqual([`page_view @ ${baseURL}/`])
    expect(google.scripts()).toEqual([SCRIPT])
    expect(await googleCookies(page)).toEqual([])
  })

  test("loads nothing on any other page, whatever the answer: the other signed-out screens, the legal pages, a shop's address", async ({ page, context, baseURL }) => {
    await saidYes(context, baseURL)

    for (const path of ["/forgot-password", "/verify-email", "/reset-password", "/privacidade", "/termos", "/uma-loja-qualquer"]) await open(page, path)

    expect(google.requests).toEqual([])
    expect(await googleCookies(page)).toEqual([])
  })
})
