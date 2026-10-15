// Libs
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test"

// Types
import type { BillingAccountAnswer, PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

/**
 * A page's Assinar screen (BEELINK-293), in a real browser: the cycles chosen with the keyboard, who
 * is charged typed into its masked field, Asaas's invoice opened in another tab, the same invoice
 * found again on coming back without paying, and the screen going on to the panel once the payment
 * is confirmed.
 *
 * The suite's API charges nothing (`BILLING_ENFORCED` is off there) and could reach no Asaas of its
 * own: the stand-in the API's e2e use lives in its test process, and the API this suite starts talks
 * to the Asaas `ASAAS_ENV` names. So the answers of the panel's billing routes are stood in for at
 * this app's own routes, and Asaas's invoice at its own address — nothing leaves the machine. What the
 * API answers to each is its own e2e's (`apps/api/test/store-subscription*.e2e-spec.ts`,
 * `subscription-payment.e2e-spec.ts`), and the routes here have their unit tests.
 *
 * The prices are made up: the screen writes none of its own.
 */

const PASSWORD = "uma-senha-bem-comprida"
const INVOICE = "https://sandbox.asaas.com/i/e2e-assinar"
/** A CPF whose check digits are right and that is nobody's. */
const CPF = "52998224725"

const catalog: PlanCatalog = {
  trialDays: 7,
  plans: [
    {
      id: "plan-e2e",
      slug: "beelink",
      name: "Beelink",
      cycles: [
        { cycle: "MONTHLY", months: 1, priceCents: 10000 },
        { cycle: "SEMIANNUAL", months: 6, priceCents: 54000 },
        { cycle: "ANNUAL", months: 12, priceCents: 96000 },
      ],
    },
  ],
}

function trialing(): StoreSubscription {
  const lastDay = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  return {
    id: "sub-e2e",
    status: "TRIALING",
    trialStartedAt: new Date().toISOString(),
    trialEndsAt: `${lastDay}T23:59:59.000Z`,
    trialLastDay: lastDay,
    trialDaysLeft: 7,
    plan: null,
    cycle: null,
    priceCents: null,
    currentPeriodEndsAt: null,
    cancelRequestedAt: null,
    freePeriodEndsAt: null,
    freePeriodLastDay: null,
    freePeriodDaysLeft: null,
    couponRedeemedAt: null,
    paymentMethod: null,
    invoiceUrl: null,
    card: null,
    graceEndsAt: null,
    lock: null,
  }
}

async function signedUpAndIn(page: Page, request: APIRequestContext): Promise<void> {
  const email = newEmail("assinar")
  await page.goto("/signup")
  await page.getByLabel("Nome").fill("Ana Souza")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByText("Confira seu e-mail")).toBeVisible()

  await page.goto(linkFrom((await waitForMessage(request, email)).Text, "/verify-email"))
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function shopOf(page: Page): Promise<string> {
  const slug = `assinar-${Date.now().toString(36)}`
  const created = await page.request.post("/api/stores", {
    headers: { "content-type": "application/json" },
    data: { name: "Loja da Assinatura", slug, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } },
  })
  expect(created.status()).toBe(201)
  return slug
}

/**
 * The panel's billing routes, as the API would answer a page in trial whose account never said who
 * is charged: the choice opens the annual invoice, and each check answers what `paid` says.
 */
async function standInForBilling(page: Page, context: BrowserContext, slug: string, paid: () => boolean) {
  const subscription = trialing()
  const chosen: StoreSubscription = { ...subscription, plan: { id: "plan-e2e", slug: "beelink", name: "Beelink" }, cycle: "ANNUAL", priceCents: 96000, invoiceUrl: INVOICE }
  const lastPaidDay = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)
  const active: StoreSubscription = { ...chosen, status: "ACTIVE", invoiceUrl: null, paymentMethod: "PIX", currentPeriodEndsAt: `${lastPaidDay}T23:59:59.000Z` }
  let current: StoreSubscription = subscription
  let account: BillingAccountAnswer = { account: null }
  const asked = { choices: [] as string[], checks: 0, accounts: [] as unknown[] }
  const answer = (body: StoreSubscriptionAnswer | object, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) })

  await page.route("**/api/billing/plans", (route) => route.fulfill(answer(catalog)))
  await page.route("**/api/billing/account", async (route) => {
    if (route.request().method() === "PUT") {
      asked.accounts.push(route.request().postDataJSON())
      account = { account: { name: "Ana Souza", document: "***.982.247-**", documentType: "CPF", customerReady: true } }
      return route.fulfill(answer(account.account!))
    }
    return route.fulfill(answer(account))
  })
  await page.route(`**/api/stores/${slug}/subscription`, async (route) => {
    if (route.request().method() === "PUT") {
      asked.choices.push((route.request().postDataJSON() as { cycle: string }).cycle)
      current = chosen
      return route.fulfill(answer({ invoiceUrl: INVOICE, subscription: chosen }))
    }
    return route.fulfill(answer({ billingEnforced: true, subscription: current }))
  })
  await page.route(`**/api/stores/${slug}/subscription/check`, async (route) => {
    asked.checks += 1
    if (paid()) current = active
    return route.fulfill(answer({ billingEnforced: true, subscription: current }))
  })
  // Asaas's own page for the invoice, which this suite never reaches.
  await context.route(INVOICE, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Fatura</title><p>Fatura de teste</p>" }))
  return asked
}

/** What TanStack hears when the panel's tab is in sight again — what a person does coming back from Asaas's page. */
const backToTheTab = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")))

test.describe("a page's Assinar screen", () => {
  test("chooses a cycle with the keyboard, opens Asaas's invoice in another tab, and finds the same invoice on coming back without paying", async ({ page, context, request }) => {
    await signedUpAndIn(page, request)
    const slug = await shopOf(page)
    const asked = await standInForBilling(page, context, slug, () => false)

    await page.goto(`/admin/${slug}/subscribe`)
    await expect(page.getByRole("heading", { level: 1, name: "Plano Beelink" })).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
    expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])

    await test.step("the cycle and who is charged, with the keyboard", async () => {
      await page.getByRole("radio", { name: "Mensal" }).focus()
      await page.keyboard.press("ArrowRight")
      await page.keyboard.press("ArrowRight")
      await expect(page.getByRole("radio", { name: "Anual" })).toBeChecked()
      await page.getByLabel("Nome completo ou razão social").focus()
      await page.keyboard.type("Ana Souza")
      await page.keyboard.press("Tab")
      await page.keyboard.type(CPF)
      await expect(page.getByLabel("CPF ou CNPJ")).toHaveValue("529.982.247-25")
    })

    const invoice = await test.step("the invoice, in another tab", async () => {
      const opening = context.waitForEvent("page")
      await page.getByRole("button", { name: /Assinar e pagar/ }).press("Enter")
      const tab = await opening
      await tab.waitForLoadState()
      return tab
    })

    expect(invoice.url()).toBe(INVOICE)
    expect(asked.accounts).toEqual([{ name: "Ana Souza", document: "529.982.247-25" }])
    expect(asked.choices).toEqual(["ANNUAL"])
    await expect(page.getByRole("heading", { level: 2, name: "Aguardando a confirmação do pagamento" })).toBeVisible()

    await test.step("back without paying: the same invoice", async () => {
      await invoice.close()
      await page.bringToFront()
      await backToTheTab(page)
      await expect.poll(() => asked.checks).toBeGreaterThan(0)
      await expect(page.getByRole("link", { name: /Abrir a fatura/ })).toHaveAttribute("href", INVOICE)
      await page.getByRole("button", { name: "Escolher outro plano" }).click()
      await expect(page.getByRole("button", { name: "Continuar o pagamento" })).toBeVisible()
    })
  })

  test("says the payment was confirmed once the API says so, and goes on to the page's panel", async ({ page, context, request }) => {
    await signedUpAndIn(page, request)
    const slug = await shopOf(page)
    let paid = false
    await standInForBilling(page, context, slug, () => paid)

    await page.goto(`/admin/${slug}/subscribe`)
    await page.getByRole("radio", { name: "Anual" }).click()
    await page.getByLabel("Nome completo ou razão social").fill("Ana Souza")
    await page.getByLabel("CPF ou CNPJ").fill(CPF)
    const opening = context.waitForEvent("page")
    await page.getByRole("button", { name: /Assinar e pagar/ }).click()
    await (await opening).close()

    paid = true
    await page.getByRole("button", { name: "Já paguei, verificar agora" }).click()

    await expect(page.getByRole("status").filter({ hasText: "Pagamento confirmado" })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/admin/${slug}$`), { timeout: 10_000 })
  })
})
