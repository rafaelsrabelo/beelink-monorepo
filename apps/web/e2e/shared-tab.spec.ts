// Libs
import { expect, test } from "@playwright/test"
import type { APIRequestContext, Browser, Page } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"

/**
 * An account signed up and confirmed in a window of its own: a page loaded in the tab under test
 * would start it over, and hide the very thing the test is after.
 */
async function confirmedAccount(browser: Browser, request: APIRequestContext, name: string): Promise<string> {
  const email = newEmail("aba")
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto("/signup")
  await page.getByLabel("Nome").fill(name)
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByText("Confira seu e-mail")).toBeVisible()
  await page.goto(linkFrom((await waitForMessage(request, email)).Text, "/verify-email"))
  await expect(page.getByText("E-mail confirmado")).toBeVisible()

  await context.close()
  return email
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
}

/** One computer, one tab, two shopkeepers: the second is shown nothing the first one read. */
test.describe("a tab handed from one person to the next", () => {
  test("signs one out and the next one in, and keeps nothing of the first", async ({ browser, page, request }) => {
    // Both before anyone signs in: what the first one reads has to still be fresh when the second arrives.
    const ana = await confirmedAccount(browser, request, "Ana Souza")
    const bruno = await confirmedAccount(browser, request, "Bruno Lima")

    await test.step("the first one signs in and works in a shop of their own", async () => {
      await page.goto("/login")
      await signIn(page, ana)
      await expect(page).toHaveURL(/\/dashboard$/)

      const created = await page.request.post("/api/stores", {
        headers: { "content-type": "application/json" },
        data: {
          name: "Loja da Ana",
          slug: `aba-${Date.now().toString(36)}`,
          type: "ECOMMERCE",
          socialNetworks: { whatsapp: "(11) 99999-8888" },
          address: { city: "São Paulo", state: "sp", zipCode: "01310-930" },
        },
      })
      expect(created.status()).toBe(201)

      await page.goto("/admin")
      await expect(page.getByRole("button", { name: "Trocar de loja" })).toContainText("Loja da Ana")
    })

    await test.step("signs out from the header", async () => {
      await page.getByRole("button", { name: "Trocar de loja" }).click()
      await page.getByRole("menuitem", { name: "Sair" }).click()
      await expect(page).toHaveURL(/\/login$/)
    })

    await test.step("the next one signs in on the same tab and sees only their own", async () => {
      await signIn(page, bruno)
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByText("Bem-vindo de volta, Bruno Lima")).toBeVisible()

      await page.getByRole("button", { name: "Trocar de loja" }).click()
      await expect(page.getByRole("menuitem", { name: "Sair" })).toBeVisible()
      await expect(page.getByText("Loja da Ana")).toHaveCount(0)
    })
  })
})
