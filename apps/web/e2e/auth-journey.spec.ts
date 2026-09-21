// Libs
import { expect, test } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"

test.describe("a person's first day", () => {
  test("signs up, confirms by e-mail, signs in, sees the dashboard and signs out", async ({ page, request }) => {
    const email = newEmail("jornada")

    await test.step("creates the account", async () => {
      await page.goto("/signup")
      await page.getByLabel("Nome").fill("Ana Souza")
      await page.getByLabel("E-mail").fill(email)
      await page.getByLabel("Senha").fill(PASSWORD)
      await page.getByRole("button", { name: "Criar conta" }).click()

      await expect(page.getByText("Confira seu e-mail")).toBeVisible()
    })

    await test.step("cannot sign in before confirming", async () => {
      await page.goto("/login")
      await page.getByLabel("E-mail").fill(email)
      await page.getByLabel("Senha").fill(PASSWORD)
      await page.getByRole("button", { name: "Entrar" }).click()

      // Not getByRole("alert"): Next's own route announcer carries that role too.
      await expect(page.getByText("Confirme seu e-mail antes de entrar")).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })

    await test.step("opens the link that arrived in the inbox", async () => {
      const message = await waitForMessage(request, email)
      expect(message.Subject).toBe("Confirme seu e-mail")

      await page.goto(linkFrom(message.Text, "/verify-email"))
      await expect(page.getByText("E-mail confirmado")).toBeVisible()
    })

    await test.step("signs in and lands on the dashboard", async () => {
      await page.goto("/login")
      await page.getByLabel("E-mail").fill(email)
      await page.getByLabel("Senha").fill(PASSWORD)
      await page.getByRole("button", { name: "Entrar" }).click()

      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByText("Bem-vindo de volta, Ana Souza")).toBeVisible()
    })

    await test.step("no token is within reach of page JavaScript", async () => {
      const readable = await page.evaluate(() => ({
        cookie: document.cookie,
        local: JSON.stringify(window.localStorage),
        session: JSON.stringify(window.sessionStorage),
      }))

      expect(readable.cookie).not.toContain("bl_access")
      expect(readable.cookie).not.toContain("bl_refresh")
      expect(readable.local).not.toContain("bl_")
      expect(readable.session).not.toContain("bl_")
    })

    await test.step("signs out, and the dashboard stops answering", async () => {
      await page.getByRole("button", { name: /Ana Souza/ }).click()
      await page.getByRole("menuitem", { name: "Sair" }).click()

      await expect(page).toHaveURL(/\/login$/)

      await page.goto("/dashboard")
      await expect(page).toHaveURL(/\/login$/)
    })
  })

  test("resets a forgotten password and ends the old session", async ({ page, request, context }) => {
    const email = newEmail("reset")

    await test.step("has a confirmed account and is signed in", async () => {
      await page.goto("/signup")
      await page.getByLabel("Nome").fill("Ana Souza")
      await page.getByLabel("E-mail").fill(email)
      await page.getByLabel("Senha").fill(PASSWORD)
      await page.getByRole("button", { name: "Criar conta" }).click()
      await expect(page.getByText("Confira seu e-mail")).toBeVisible()

      const confirmation = await waitForMessage(request, email)
      await page.goto(linkFrom(confirmation.Text, "/verify-email"))

      await page.goto("/login")
      await page.getByLabel("E-mail").fill(email)
      await page.getByLabel("Senha").fill(PASSWORD)
      await page.getByRole("button", { name: "Entrar" }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
    })

    const signedInCookies = await context.cookies()

    await test.step("asks for a new password", async () => {
      await context.clearCookies()
      await page.goto("/forgot-password")
      await page.getByLabel("E-mail").fill(email)
      await page.getByRole("button", { name: "Enviar link" }).click()

      await expect(page.getByText("Confira seu e-mail")).toBeVisible()
    })

    await test.step("sets it through the e-mailed link", async () => {
      const reset = await waitForMessage(request, email)
      expect(reset.Subject).toBe("Redefinir sua senha")

      await page.goto(linkFrom(reset.Text, "/reset-password"))
      await page.getByLabel("Nova senha", { exact: true }).fill("outra-senha-bem-comprida")
      await page.getByLabel("Repita a nova senha").fill("outra-senha-bem-comprida")
      await page.getByRole("button", { name: "Salvar senha" }).click()

      await expect(page).toHaveURL(/\/login$/)
    })

    await test.step("the session that existed before the reset is dead", async () => {
      await context.addCookies(signedInCookies)
      await page.goto("/dashboard")

      await expect(page).toHaveURL(/\/login$/)
    })

    await test.step("the new password works", async () => {
      await page.getByLabel("E-mail").fill(email)
      await page.getByLabel("Senha").fill("outra-senha-bem-comprida")
      await page.getByRole("button", { name: "Entrar" }).click()

      await expect(page).toHaveURL(/\/dashboard$/)
    })
  })

  test("reads the screens in English when the browser asks for it", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" })
    const page = await context.newPage()

    await page.goto("/login")

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    await context.close()
  })
})
