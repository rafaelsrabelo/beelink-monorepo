// Libs
import { expect, test, type Page } from "@playwright/test"
import type { APIRequestContext } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"

async function signedUpAndIn(page: Page, request: APIRequestContext): Promise<string> {
  const email = newEmail("sessao")
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
  return email
}

/** BEELINK-169: a panel left open past its access token's quarter of an hour keeps working. */
test.describe("a panel left open", () => {
  test("writes on once the access token ran out, the pair renewed on the way", async ({ page, request, context }) => {
    await signedUpAndIn(page, request)

    await test.step("the access cookie runs out, as it does fifteen minutes in", async () => {
      await context.clearCookies({ name: "bl_access" })
    })

    await test.step("the next write works, and brings a new access cookie", async () => {
      const slug = `sessao-${Date.now().toString(36)}`
      const created = await page.request.post("/api/stores", {
        headers: { "content-type": "application/json" },
        data: { name: "Loja da Sessão", slug, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } },
      })

      expect(created.status()).toBe(201)
      expect((await context.cookies()).some((cookie) => cookie.name === "bl_access")).toBe(true)
    })
  })

  test("with the session over, signs in again and comes back to the page it was on", async ({ page, request, context }) => {
    const email = await signedUpAndIn(page, request)
    // Off the dashboard first: a call of its own finding the session gone would send the tab to sign
    // in for the dashboard, racing the visit to /create-store this test is about.
    await page.goto("about:blank")
    await context.clearCookies({ name: "bl_access" })
    await context.clearCookies({ name: "bl_refresh" })

    await page.goto("/create-store")
    await expect(page).toHaveURL(/\/login\?voltar=%2Fcreate-store$/)

    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Senha").fill(PASSWORD)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/create-store$/)
  })
})
