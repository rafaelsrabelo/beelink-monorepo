// Libs
import { expect, test } from "@playwright/test"
import type { APIRequestContext, Page } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"

/** The proxy keeps its copy of the addresses left for a minute: an address just left may take that long to lead on. */
const PROXY_LEARNS_WITHIN_MS = 90_000

const json = { "content-type": "application/json" }

/** A shopkeeper with a confirmed account, signed in to the panel on this page. */
async function shopkeeper(page: Page, request: APIRequestContext, label: string): Promise<void> {
  const email = newEmail(label)

  await page.goto("/signup")
  await page.getByLabel("Nome").fill("Dona da Loja")
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

/** Where the first answer to `path` leads, read with no redirect followed: its status and its address. */
async function firstHop(page: Page, path: string): Promise<[number, string | null]> {
  const response = await page.request.get(path, { maxRedirects: 0 })
  const location = response.headers()["location"] ?? null
  if (location === null) return [response.status(), null]
  const to = new URL(location, "http://x.invalid")
  return [response.status(), `${to.pathname}${to.search}`]
}

/**
 * A page created with the wrong address (BEELINK-331): its owner changes it from the settings, and
 * every address of the old one — the shop window, a product, the cart, the panel — leads to the new.
 */
test.describe("a page's address changes, and the old one leads to the new", () => {
  // A computer's width: the settings' tabs and the screen's frame as a shopkeeper reads them.
  test.use({ viewport: { width: 1440, height: 900 } })

  test("from the settings, once every 30 days, the old address reserved and leading on", async ({ page, request, browser }) => {
    test.setTimeout(PROXY_LEARNS_WITHIN_MS + 150_000)

    const stamp = Date.now().toString(36)
    const old = `teste-331-errado-${stamp}`
    const fresh = `teste-331-${stamp}`
    let productSlug = ""

    await test.step("a shopkeeper opens a page at the wrong address, with a product in it", async () => {
      await shopkeeper(page, request, "endereco")

      const shop = await page.request.post("/api/stores", { headers: json, data: { name: "Teste 331", slug: old, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } } })
      expect(shop.status()).toBe(201)
      const product = await page.request.post(`/api/stores/${old}/products`, { headers: json, data: { name: `Pão de Queijo ${stamp}`, priceCents: 990 } })
      expect(product.status()).toBe(201)
      productSlug = ((await product.json()) as { slug: string }).slug
    })

    await test.step("its settings lead to the screen that changes the address", async () => {
      await page.goto(`/admin/${old}/store`)
      await page.getByRole("link", { name: "Trocar endereço" }).click()
      await expect(page).toHaveURL(new RegExp(`/admin/${old}/store/address$`))
      await expect(page.getByRole("heading", { level: 1, name: "Trocar endereço" })).toBeVisible()
    })

    await test.step("what is typed is shown as it will be stored, said free, and changed after a question", async () => {
      await page.getByLabel("Novo endereço").fill(`Teste 331 ${stamp}`)
      await expect(page.getByText(new RegExp(`^Vai ficar assim: [^ ]+/${fresh}$`))).toBeVisible()
      await expect(page.getByText("Este endereço está livre.")).toBeVisible()

      await page.getByRole("button", { name: "Trocar endereço" }).click()
      await page.getByRole("alertdialog").getByRole("button", { name: "Trocar endereço" }).click()

      // The panel goes to the new address with no signing out, and says it is done.
      await expect(page).toHaveURL(new RegExp(`/admin/${fresh}/store/address\\?trocado=1$`))
      await expect(page.getByText(/^Pronto: o endereço da página agora é/)).toBeVisible()
      await expect(page.getByText(/Você poderá trocar de novo a partir de \d{2}\/\d{2}\/\d{4}\./)).toBeVisible()
      await expect(page.getByLabel("Novo endereço")).toHaveCount(0)
    })

    await test.step("within the proxy's minute, the old shop window leads to the new one for good", async () => {
      await expect(async () => {
        expect(await firstHop(page, `/${old}`)).toEqual([308, `/${fresh}`])
      }).toPass({ timeout: PROXY_LEARNS_WITHIN_MS, intervals: [2_000] })

      await page.goto(`/${old}`)
      await expect(page).toHaveURL(new RegExp(`/${fresh}$`))
      await expect(page.getByRole("heading", { level: 1, name: "Teste 331" })).toBeAttached()
    })

    await test.step("and so do a product, the cart and the panel, the rest of the address kept", async () => {
      expect(await firstHop(page, `/${old}/produtos/${productSlug}?cor=azul`)).toEqual([308, `/${fresh}/produtos/${productSlug}?cor=azul`])
      expect(await firstHop(page, `/${old}/carrinho`)).toEqual([308, `/${fresh}/carrinho`])
      expect(await firstHop(page, `/admin/${old}/orders`)).toEqual([308, `/admin/${fresh}/orders`])

      await page.goto(`/${old}/produtos/${productSlug}`)
      await expect(page).toHaveURL(new RegExp(`/${fresh}/produtos/${productSlug}$`))
      await expect(page.getByRole("heading", { level: 1, name: `Pão de Queijo ${stamp}` })).toBeVisible()
    })

    await test.step("another account cannot take the old address", async () => {
      const other = await browser.newContext()
      const otherPage = await other.newPage()
      await shopkeeper(otherPage, otherPage.request, "outra")

      const taken = await otherPage.request.post("/api/stores", { headers: json, data: { name: "Outra", slug: old, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" } } })
      expect(taken.status()).toBe(409)
      expect(await taken.json()).toMatchObject({ errorCode: "STORE_SLUG_TAKEN" })
      await other.close()
    })

    await test.step("a second change within 30 days is refused, with the day it is accepted again", async () => {
      const again = await page.request.put(`/api/stores/${fresh}/slug`, { headers: json, data: { slug: `${fresh}-dois` } })

      expect(again.status()).toBe(409)
      expect(await again.json()).toMatchObject({ errorCode: "STORE_SLUG_CHANGE_TOO_SOON", details: { changeableOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } })
    })
  })
})
