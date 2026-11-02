// Libs
import { expect, test } from "@playwright/test"
import type { APIRequestContext, Locator, Page } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"
const json = { "content-type": "application/json" }

/** A shopkeeper with a confirmed account, signed in to the panel on this page. */
async function shopkeeper(page: Page, request: APIRequestContext): Promise<void> {
  const email = newEmail("ordem")

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

/** A mouse's whole gesture: dnd-kit waits for a few pixels of travel before a drag begins. */
async function drag(page: Page, from: Locator, to: Locator): Promise<void> {
  const start = (await from.boundingBox())!
  const end = (await to.boundingBox())!

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2 + 8, start.y + start.height / 2 + 8, { steps: 4 })
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 14 })
  await page.mouse.up()
  // dnd-kit swallows every click for 50ms after a drop, so that the drop is not read as a click. A
  // person is not that fast; a test is, and its next click would pass React by and navigate natively.
  await page.waitForTimeout(100)
}

/**
 * The shopkeeper chooses what comes first: by the arrows on the list, by dragging a card as the shop
 * draws it, both on one unsaved order. Saved, the visitor sees it, and what is off the shelf is not.
 */
test.describe("the order of the shop window", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("arranged in both views, saved once, and served to a visitor", async ({ page, request, browser }) => {
    test.setTimeout(120_000)

    const slug = `teste-ordem-${Date.now().toString(36)}`
    const save = page.getByRole("button", { name: "Salvar ordem" })
    const rows = page.getByRole("listitem").locator("span.truncate.font-medium")
    const shelf = page.locator("[data-shop-window] ol > li")

    await test.step("a shopkeeper has a shop with a draft in it", async () => {
      await shopkeeper(page, request)

      const shop = await page.request.post("/api/stores", { headers: json, data: { name: "Teste Ordem", slug, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } } })
      expect(shop.status()).toBe(201)
      for (const data of [
        { name: "Whey", priceCents: 13990 },
        { name: "Creatina", priceCents: 8990 },
        { name: "Barra", priceCents: 1190, status: "DRAFT" },
        { name: "Glutamina", priceCents: 7990 },
      ]) {
        expect((await page.request.post(`/api/stores/${slug}/products`, { headers: json, data })).status()).toBe(201)
      }
    })

    await test.step("the list leads to the screen, where nothing is offered until something moves", async () => {
      await page.goto(`/admin/${slug}/products`)
      await page.getByRole("link", { name: "Ordenar vitrine" }).click()
      await expect(rows).toHaveText(["Whey", "Creatina", "Barra", "Glutamina"])
      await expect(save).toBeDisabled()
    })

    await test.step("an arrow moves a product, and undoing puts it back", async () => {
      await page.getByRole("button", { name: "Mover para o topo: Glutamina" }).click()
      await expect(rows).toHaveText(["Glutamina", "Whey", "Creatina", "Barra"])
      await page.getByRole("button", { name: "Desfazer" }).click()
      await expect(rows).toHaveText(["Whey", "Creatina", "Barra", "Glutamina"])
      await page.getByRole("button", { name: "Mover para o topo: Glutamina" }).click()
    })

    await test.step("the shop's view draws the same order, and a card dragged changes it", async () => {
      await page.getByRole("button", { name: "Como na vitrine" }).click()
      await expect(page).toHaveURL(/view=shelf/)
      await expect(shelf.locator("article a")).toHaveText(["Glutamina", "Whey", "Creatina", "Barra"])
      await expect(shelf.nth(3).getByText("Rascunho")).toBeVisible()

      await drag(page, shelf.nth(2).locator("article"), shelf.nth(0).locator("article"))
      await expect(shelf.locator("article a")).toHaveText(["Creatina", "Glutamina", "Whey", "Barra"])
    })

    await test.step("leaving unsaved asks first", async () => {
      await page.getByRole("link", { name: /Voltar para produtos/ }).click()
      await expect(page.getByText("Sair sem salvar a ordem?")).toBeVisible()
      await page.getByRole("button", { name: "Continuar ordenando" }).click()
    })

    await test.step("saved, it holds through a reload", async () => {
      await save.click()
      await expect(page.getByText("Ordem salva. A loja já mostra assim.")).toBeVisible()
      await page.reload()
      await expect(shelf.locator("article a")).toHaveText(["Creatina", "Glutamina", "Whey", "Barra"])
    })

    await test.step("a visitor sees it at once, without the draft", async () => {
      const visitor = await (await browser.newContext()).newPage()
      await visitor.goto(`/${slug}/produtos`)
      await expect(visitor.locator("article a").filter({ hasText: /\S/ })).toHaveText(["Creatina", "Glutamina", "Whey"])
    })
  })
})
