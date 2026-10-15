// Libs
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test"

// Types
import type { BillingAccountAnswer, PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

/**
 * A page locked for want of payment, in its owner's panel (BEELINK-296), in a real browser: every
 * screen of the page gives way to the notice — why, what each period costs, the way to the Assinar
 * screen — while the shell stays open and the owner's other page stays as it was; the page is paid
 * from the notice and its panel comes back without signing out; and the strips over a page about to
 * lock lead to the same screen.
 *
 * The suite's API charges and locks nothing (`BILLING_ENFORCED` is off there), so the page's billing
 * routes are stood in for at this app's own routes, as `subscribe.spec.ts` does, and Asaas's invoice at
 * its own address. Everything else — the shell, the screens, the other page — is the API's real answer.
 * What the API refuses of a locked page is its own e2e's (`apps/api/test/page-lock.e2e-spec.ts`).
 *
 * The prices are made up: the notice writes none of its own.
 */

const PASSWORD = "uma-senha-bem-comprida"
const INVOICE = "https://sandbox.asaas.com/i/e2e-travada"
const DAY = 86_400_000

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

/** A day `offset` days from today, as the wire says one: `YYYY-MM-DD`. */
const dayFromToday = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10)

/** A page whose trial ends `daysLeft` days from today — or ended, below zero — with nothing paid, chosen or given. */
function trial(daysLeft: number): StoreSubscription {
  const lastDay = dayFromToday(daysLeft)
  return {
    id: "sub-e2e",
    status: daysLeft < 0 ? "TRIAL_EXPIRED" : "TRIALING",
    trialStartedAt: new Date(Date.now() - 7 * DAY).toISOString(),
    trialEndsAt: `${dayFromToday(daysLeft + 1)}T03:00:00.000Z`,
    trialLastDay: lastDay,
    trialDaysLeft: Math.max(daysLeft, 0),
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
    lock: daysLeft < 0 ? "TRIAL_EXPIRED" : null,
  }
}

async function signedUpAndIn(page: Page, request: APIRequestContext): Promise<void> {
  const email = newEmail("travada")
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

async function shopOf(page: Page, name: string, prefix: string): Promise<string> {
  const slug = `${prefix}-${Date.now().toString(36)}`
  const created = await page.request.post("/api/stores", {
    headers: { "content-type": "application/json" },
    data: { name, slug, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } },
  })
  expect(created.status()).toBe(201)
  return slug
}

const json = (body: object, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) })

/**
 * The page's billing routes, as the API would answer them: the subscription is `standing()` until the
 * page is paid, the choice opens the monthly invoice, and each check answers the page paid once `paid()`
 * says so. The account already said who is charged.
 */
async function standInForBilling(page: Page, context: BrowserContext, slug: string, standing: () => StoreSubscription, paid: () => boolean = () => false) {
  const chosen = (): StoreSubscription => ({ ...standing(), plan: { id: "plan-e2e", slug: "beelink", name: "Beelink" }, cycle: "MONTHLY", priceCents: 10000, invoiceUrl: INVOICE })
  const active = (): StoreSubscription => ({ ...chosen(), status: "ACTIVE", lock: null, invoiceUrl: null, paymentMethod: "PIX", currentPeriodEndsAt: `${dayFromToday(31)}T03:00:00.000Z` })
  let current: (() => StoreSubscription) | null = null
  const now = () => (paid() ? active() : (current ?? standing)())
  const answer = (): StoreSubscriptionAnswer => ({ billingEnforced: true, subscription: now() })
  const account: BillingAccountAnswer = { account: { name: "Ana Souza", document: "***.982.247-**", documentType: "CPF", customerReady: true } }

  await page.route("**/api/billing/plans", (route) => route.fulfill(json(catalog)))
  await page.route("**/api/billing/account", (route) => route.fulfill(json(account)))
  await page.route(`**/api/stores/${slug}/subscription`, async (route) => {
    if (route.request().method() !== "PUT") return route.fulfill(json(answer()))
    current = chosen
    return route.fulfill(json({ invoiceUrl: INVOICE, subscription: now() }))
  })
  await page.route(`**/api/stores/${slug}/subscription/check`, (route) => route.fulfill(json(answer())))
  // Asaas's own page for the invoice, which this suite never reaches.
  await context.route(INVOICE, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Fatura</title><p>Fatura de teste</p>" }))
}

/** Axe over the page, or over one part of it: `within` is a selector. */
async function expectNoViolations(page: Page, within?: string) {
  const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  const { violations } = await (within ? axe.include(within) : axe).analyze()
  expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
}

test.describe("a locked page's panel", () => {
  test("leads every screen of the page to its notice, keeps the shell open, and leaves the owner's other page as it was", async ({ page, context, request }) => {
    await signedUpAndIn(page, request)
    const locked = await shopOf(page, "Loja Travada", "travada")
    await shopOf(page, "Loja Aberta", "aberta")
    await standInForBilling(page, context, locked, () => trial(-2))

    await page.goto(`/admin/${locked}/orders`)
    await expect(page.getByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeVisible()
    await expect(page.getByText(/^Mensal: R\$\s100,00 por mês$/)).toBeVisible()
    await expect(page.getByText(/^Anual: R\$\s960,00 a cada 12 meses, R\$\s80,00 por mês$/)).toBeVisible()
    await expect(page.getByRole("link", { name: "Escolher um plano" })).toHaveAttribute("href", `/admin/${locked}/subscribe`)
    await expect(page.getByText("Suas outras páginas continuam funcionando normalmente.")).toBeVisible()
    await expectNoViolations(page)

    await test.step("another screen of the same page: the same notice", async () => {
      await page.getByRole("link", { name: "Produtos" }).click()
      await expect(page).toHaveURL(new RegExp(`/admin/${locked}/products$`))
      await expect(page.getByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeVisible()
    })

    await test.step("the switch to the other page, in the shell: it opens as ever", async () => {
      await page.getByRole("button", { name: "Trocar de loja" }).click()
      await page.getByRole("menuitem", { name: "Loja Aberta" }).click()
      await expect(page.getByRole("heading", { level: 1, name: "Loja Aberta" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Seu teste grátis acabou" })).toHaveCount(0)
    })
  })

  test("is paid from the notice, and the page's panel comes back without signing out", async ({ page, context, request }) => {
    await signedUpAndIn(page, request)
    const slug = await shopOf(page, "Loja Travada", "travada")
    let paid = false
    await standInForBilling(page, context, slug, () => trial(-2), () => paid)

    await page.goto(`/admin/${slug}`)
    await page.getByRole("link", { name: "Escolher um plano" }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/${slug}/subscribe$`))

    const opening = context.waitForEvent("page")
    await page.getByRole("button", { name: /Assinar e pagar/ }).click()
    await (await opening).close()

    paid = true
    await page.getByRole("button", { name: "Já paguei, verificar agora" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Pagamento confirmado" })).toBeVisible()

    await expect(page).toHaveURL(new RegExp(`/admin/${slug}$`), { timeout: 10_000 })
    await expect(page.getByRole("heading", { level: 1, name: "Loja Travada" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Seu teste grátis acabou" })).toHaveCount(0)
  })

  test("warns over the screens of a page about to lock — the trial's last days, the grace — leading to the Assinar screen", async ({ page, context, request }) => {
    await signedUpAndIn(page, request)
    const slug = await shopOf(page, "Loja Quase", "quase")
    let standing = trial(1)
    await standInForBilling(page, context, slug, () => standing)

    await page.goto(`/admin/${slug}/orders`)
    const strip = page.getByRole("region", { name: /^O teste grátis desta página termina amanhã/ })
    await expect(strip).toBeVisible()
    await expect(strip.getByRole("link", { name: "Escolher um plano" })).toHaveAttribute("href", `/admin/${slug}/subscribe`)
    await expect(page.getByRole("heading", { level: 1, name: "Pedidos" })).toBeVisible()
    // The strip alone: the orders screen under it has greys of its own at 4.42:1 on the panel's ground,
    // from before this suite (seen by axe here, as BEELINK-293 saw on the Assinar screen).
    await expectNoViolations(page, "section.bg-warning")

    standing = { ...trial(0), status: "PAST_DUE", cycle: "MONTHLY", priceCents: 10000, currentPeriodEndsAt: `${dayFromToday(-2)}T03:00:00.000Z`, graceEndsAt: `${dayFromToday(6)}T03:00:00.000Z` }
    await page.reload()
    const grace = page.getByRole("region", { name: "A renovação desta página não foi paga" })
    await expect(grace).toContainText("Pague até")
    await expect(grace.getByRole("link", { name: "Pagar a renovação" })).toHaveAttribute("href", `/admin/${slug}/subscribe`)
  })
})
