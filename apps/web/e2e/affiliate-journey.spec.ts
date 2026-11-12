// Libs
import { expect, test } from "@playwright/test"
import type { APIRequestContext, Page } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"
const json = { "content-type": "application/json" }

/** A shopkeeper with a confirmed account, signed in to the panel on this page. */
async function shopkeeper(page: Page, request: APIRequestContext): Promise<void> {
  const email = newEmail("loja-afiliados")

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

/**
 * The affiliates epic through the browser (IMPULSEIA-109): the shop invites from its panel, the
 * person invited signs up from the e-mail's link and takes a `/name`, a visitor who follows it is
 * told whose recommendation brought them — on arrival, while browsing and in the cart — and the
 * affiliate finds the shop, the link and the visit in their own area. The order and its commission
 * are walked through the API's own end-to-end suite; this one is what a person sees.
 */
test.describe("a shop's affiliate, in the browser", () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test("invited in the panel, signed up by the e-mail, named on the shop window, and at home in their area", async ({ page, request, browser }) => {
    test.setTimeout(180_000)

    const slug = `teste-afiliado-${Date.now().toString(36)}`
    const mariaEmail = newEmail("afiliada")
    let productSlug = ""

    await test.step("a shop with a product and its programme switched on", async () => {
      await shopkeeper(page, request)

      const shop = await page.request.post("/api/stores", { headers: json, data: { name: "Loja Afiliados", slug, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } } })
      expect(shop.status()).toBe(201)
      const product = await page.request.post(`/api/stores/${slug}/products`, { headers: json, data: { name: "Whey", priceCents: 10_000 } })
      expect(product.status()).toBe(201)
      productSlug = ((await product.json()) as { slug: string }).slug

      const program = await page.request.put(`/api/stores/${slug}/affiliate-program`, { headers: json, data: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: "Comissão paga por Pix." } })
      expect(program.status()).toBe(200)
    })

    await test.step("the panel invites Maria by e-mail", async () => {
      await page.goto(`/admin/${slug}/affiliates`)
      await page.getByRole("button", { name: "Convidar afiliado" }).first().click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("Nome").fill("Maria Souza")
      await dialog.getByLabel("E-mail").fill(mariaEmail)
      await dialog.getByRole("button", { name: "Enviar convite" }).click()

      await expect(page.getByText(`Convite enviado para ${mariaEmail}.`)).toBeVisible()
      await expect(page.getByText("Maria Souza")).toBeVisible()
    })

    const maria = await (await browser.newContext()).newPage()

    await test.step("Maria opens the e-mail's link, takes her /name and signs up", async () => {
      await maria.goto(linkFrom((await waitForMessage(request, mariaEmail)).Text, "/afiliado/convite"))
      await expect(maria.getByRole("heading", { name: "Sua comissão" })).toBeVisible()
      await expect(maria.getByText("Comissão paga por Pix.")).toBeVisible()

      await maria.getByLabel("Seu nome", { exact: true }).fill("Maria Souza")
      await maria.getByLabel("Crie uma senha").fill(PASSWORD)
      await maria.getByLabel("Seu nome no link").fill("maria")
      await expect(maria.getByText("Disponível.", { exact: false })).toBeVisible()
      await maria.getByRole("checkbox", { name: "Li e aceito os termos da loja" }).click()
      await maria.getByRole("button", { name: "Criar conta e aceitar" }).click()

      await expect(maria.getByText("Pronto! Você vende pela Loja Afiliados")).toBeVisible()
      await expect(maria.getByText(new RegExp(`/${slug}/maria`)).first()).toBeVisible()
    })

    const visitor = await (await browser.newContext()).newPage()

    await test.step("a visitor who follows the link is told whose recommendation brought them, everywhere it counts", async () => {
      await visitor.goto(`/${slug}/maria`)
      await expect(visitor).toHaveURL(new RegExp(`/${slug}\\?afiliado=maria`))
      await expect(visitor.getByText("Você chegou pela indicação de")).toBeVisible()
      await expect(visitor.getByText("Maria Souza").first()).toBeVisible()
      await expect.poll(async () => (await visitor.context().cookies()).some((cookie) => cookie.name === "bl_affiliate")).toBe(true)

      await visitor.goto(`/${slug}/produtos/${productSlug}`)
      // The strip speaks of the affiliate by their first name; the arrival card, by the whole of it.
      await expect(visitor.getByText(/^Comprando pela indicação de Maria/)).toBeVisible()
      await visitor.getByRole("button", { name: "Adicionar ao carrinho" }).first().click()

      await visitor.goto(`/${slug}/carrinho`)
      await expect(visitor.getByText(/^Indicação de Maria/)).toBeVisible()
      await expect(visitor.getByText(/^Maria( Souza)? verá seu nome neste pedido\.$/)).toBeVisible()
    })

    await test.step("Maria finds the shop, her link and the visit in her own area", async () => {
      await maria.goto("/afiliado")
      await maria.getByRole("link", { name: /Loja Afiliados/ }).first().click()
      await expect(maria).toHaveURL(new RegExp(`/afiliado/${slug}`))
      await expect(maria.getByText("Seu link", { exact: true })).toBeVisible()
      await expect(maria.getByText(new RegExp(`/${slug}/maria`)).first()).toBeVisible()
      await expect(maria.getByText("Visitas pelo link")).toBeVisible()
    })

    await test.step("and the panel lists her as active", async () => {
      await page.goto(`/admin/${slug}/affiliates`)
      await expect(page.getByText("Ativo").first()).toBeVisible()
    })
  })
})
