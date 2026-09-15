// Node
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"

// Libs
import { expect, test } from "@playwright/test"

// Support
import { linkFrom, waitForMessage } from "./support/mailpit"

/**
 * The images in the README, taken from the running app — so they cannot drift from what it looks
 * like. They live outside docs/, which the docs-tier gate keeps to the harness's four tiers.
 *
 * Tagged @screenshot: `pnpm --filter web test:e2e` skips them, `pnpm screenshots` takes them.
 */
// Playwright runs from apps/web, and loads this file as CommonJS — no import.meta here.
const RESULT_DIR = resolve(process.cwd(), "../../assets/screenshots")
const PASSWORD = "uma-senha-bem-comprida"

test.beforeAll(() => {
  mkdirSync(RESULT_DIR, { recursive: true })
})

test.use({ viewport: { width: 1280, height: 860 } })

test("@screenshot the signed-out screens", async ({ page }) => {
  await page.goto("/login")
  await page.screenshot({ path: `${RESULT_DIR}/login.png` })

  await page.goto("/signup")
  await page.screenshot({ path: `${RESULT_DIR}/signup.png` })

  // The same screen refusing what the API refused.
  await page.goto("/login")
  await page.getByLabel("E-mail").fill("ninguem@exemplo.test")
  await page.getByLabel("Senha").fill("senha-que-nao-serve")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible()
  await page.screenshot({ path: `${RESULT_DIR}/login-error.png` })
})

test("@screenshot the dashboard, in both themes and both languages", async ({ page, request, browser }) => {
  // A readable address, since it ends up in the picture. The account survives between runs, so the
  // sign-up is only walked through the first time.
  const email = "ana.souza@exemplo.com"

  await page.goto("/signup")
  await page.getByLabel("Nome").fill("Ana Souza")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Criar conta" }).click()

  // Wait for whichever answer comes back before asking which one it was.
  const taken = page.getByText("Este e-mail já está cadastrado.")
  await expect(page.getByText("Confira seu e-mail").or(taken)).toBeVisible()
  const alreadyExists = await taken.isVisible()

  if (!alreadyExists) {
    await expect(page.getByText("Confira seu e-mail")).toBeVisible()
    await page.screenshot({ path: `${RESULT_DIR}/signup-sent.png` })

    const message = await waitForMessage(request, email)
    await page.goto(linkFrom(message.Text, "/verify-email"))
    await expect(page.getByText("E-mail confirmado")).toBeVisible()
    await page.screenshot({ path: `${RESULT_DIR}/verify-email.png` })
  }

  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("Bem-vindo de volta, Ana Souza")).toBeVisible()
  // The chart draws after it measures its container; without this the picture shows empty axes.
  await expect(page.locator(".recharts-area-area").first()).toBeVisible()
  await page.screenshot({ path: `${RESULT_DIR}/dashboard.png` })

  // The same session, read in English.
  await page.context().addCookies([
    { name: "locale", value: "en", url: "http://localhost:3000" },
  ])
  await page.reload()
  await expect(page.getByText("Welcome back, Ana Souza")).toBeVisible()
  await expect(page.locator(".recharts-area-area").first()).toBeVisible()
  await page.screenshot({ path: `${RESULT_DIR}/dashboard-en.png` })

  // And in the dark, which is a token swap and nothing else.
  const dark = await browser.newContext({ colorScheme: "dark", viewport: { width: 1280, height: 860 } })
  const darkPage = await dark.newPage()
  await dark.addCookies(await page.context().cookies())
  await dark.addCookies([{ name: "locale", value: "pt-BR", url: "http://localhost:3000" }])
  await darkPage.goto("/dashboard")
  await expect(darkPage.getByText("Bem-vindo de volta, Ana Souza")).toBeVisible()
  await expect(darkPage.locator(".recharts-area-area").first()).toBeVisible()
  await darkPage.screenshot({ path: `${RESULT_DIR}/dashboard-dark.png` })
  await dark.close()
})
