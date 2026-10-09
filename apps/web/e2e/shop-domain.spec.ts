// Node
import { execFileSync } from "node:child_process"
import path from "node:path"

// Libs
import { expect, test } from "@playwright/test"
import type { APIRequestContext, Page } from "@playwright/test"

// Support
import { linkFrom, newEmail, waitForMessage } from "./support/mailpit"

const PASSWORD = "uma-senha-bem-comprida"

/** The proxy keeps its copy of the table of hosts for a minute: a domain just saved may take that long to open the shop. */
const PROXY_LEARNS_WITHIN_MS = 90_000

/**
 * Writes to the database the API under test runs on — the one way a domain becomes `ACTIVE` here:
 * the API's own check asks the DNS and an HTTPS answer, and no test has either. `prisma db execute`
 * reads `DATABASE_URL` as the API does, so the two cannot be pointed at different databases.
 */
function inDatabase(statement: string): void {
  execFileSync("pnpm", ["--filter", "api", "exec", "prisma", "db", "execute", "--stdin"], {
    cwd: path.resolve(__dirname, "../../.."),
    input: statement,
    env: process.env,
    stdio: ["pipe", "ignore", "inherit"],
  })
}

/** A shopkeeper with a confirmed account, signed in to the panel on this page. */
async function shopkeeper(page: Page, request: APIRequestContext): Promise<void> {
  const email = newEmail("dominio")

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
 * A shop at its own domain (BEELINK-283). Chromium resolves every `*.localhost` to this machine, so
 * `http://<slug>.localhost:<port>` reaches the same server under a host that is the shop's alone —
 * what a visitor's browser does with `minhaloja.com.br` once its DNS points at the server.
 */
test.describe("a shop at its own domain", () => {
  // A computer's width: on a narrow one the shelf's filters are behind a button.
  test.use({ viewport: { width: 1440, height: 900 } })

  test("opens at the root, sells with no slug in any address, and takes its old address with it", async ({ page, request, context, baseURL }) => {
    test.setTimeout(PROXY_LEARNS_WITHIN_MS + 120_000)

    const port = new URL(baseURL ?? "http://localhost:3100").port
    const stamp = Date.now().toString(36)
    const slug = `dominio-${stamp}`
    const domain = `loja-${stamp}.localhost`
    const shopName = `Loja do Domínio ${stamp}`
    const productName = `Bolsa Amora ${stamp}`
    const at = (pathname: string) => `http://${domain}:${port}${pathname}`
    let productSlug = ""

    /** Every address a page offers: none of the shop's own may carry the slug. `/<slug>/api/…` is a form's action, never a link. */
    const slugInAnAddress = async () =>
      page.locator("a[href]").evaluateAll(
        (anchors, shop) => anchors.map((anchor) => anchor.getAttribute("href") ?? "").filter((href) => new URL(href, window.location.href).pathname.split("/")[1] === shop),
        slug,
      )
    /**
     * The product's card, by where it leads: its address with no slug. By name it would be the heart
     * beside it too — "Entre para curtir <product>" — which leads to the sign-in.
     */
    const productCard = () => page.locator(`a[href="/produtos/${productSlug}"]`).first()
    /** Where the page is: at the shop's domain, at an address with no slug. */
    const expectAt = async (pathname: string | RegExp) => {
      const url = new URL(page.url())
      expect(url.host).toBe(`${domain}:${port}`)
      if (typeof pathname === "string") expect(url.pathname).toBe(pathname)
      else expect(url.pathname).toMatch(pathname)
      expect(await slugInAnAddress()).toEqual([])
    }

    await test.step("a shopkeeper opens a shop with a product in it, on the platform's host", async () => {
      await shopkeeper(page, request)
      const json = { "content-type": "application/json" }

      const shop = await page.request.post("/api/stores", {
        headers: json,
        data: { name: shopName, slug, type: "ECOMMERCE", socialNetworks: { whatsapp: "(11) 99999-8888" }, address: { city: "São Paulo", state: "sp", zipCode: "01310-930" } },
      })
      expect(shop.status()).toBe(201)

      const category = await page.request.post(`/api/stores/${slug}/product-categories`, { headers: json, data: { name: "Bolsas" } })
      expect(category.status()).toBe(201)
      const { id: categoryId } = (await category.json()) as { id: string }

      const product = await page.request.post(`/api/stores/${slug}/products`, { headers: json, data: { name: productName, priceCents: 12990, categoryId } })
      expect(product.status()).toBe(201)
      productSlug = ((await product.json()) as { slug: string }).slug

      // A second price, so the shelf has a price range to be narrowed by.
      const other = await page.request.post(`/api/stores/${slug}/products`, { headers: json, data: { name: `Bolsa Jabuticaba ${stamp}`, priceCents: 15990, categoryId } })
      expect(other.status()).toBe(201)
    })

    await test.step("the shop is at its slug while it has no domain", async () => {
      await page.goto(`/${slug}`)
      await expect(page).toHaveURL(new RegExp(`localhost:${port}/${slug}$`))
      await expect(page.getByRole("heading", { level: 1, name: shopName })).toBeAttached()
    })

    await test.step("its domain goes active, and within the proxy's minute opens the shop at the root", async () => {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(domain).toMatch(/^[a-z0-9-]+\.localhost$/)
      inDatabase(`UPDATE stores SET "customDomain" = '${domain}', "customDomainStatus" = 'ACTIVE', "customDomainCheckedAt" = now(), "customDomainProblem" = NULL WHERE slug = '${slug}';`)

      // Until the proxy's copy is read again, the host is nobody's, and its root is the platform's landing page.
      await expect(async () => {
        await page.goto(at("/"))
        await expect(page.getByRole("heading", { level: 1, name: shopName })).toBeAttached({ timeout: 1_000 })
      }).toPass({ timeout: PROXY_LEARNS_WITHIN_MS, intervals: [2_000] })
      await expectAt("/")
    })

    await test.step("the favicon answers there, which is what the API's check of a domain asks for", async () => {
      const favicon = await page.goto(at("/favicon.ico"))
      expect(favicon?.status()).toBe(200)
    })

    await test.step("the catalogue, a category and a search are at addresses with no slug", async () => {
      await page.goto(at("/produtos"))
      await expect(page.getByRole("heading", { level: 1, name: "Todos os produtos" })).toBeVisible()
      await expect(productCard()).toBeVisible()
      await expectAt("/produtos")

      await page.goto(at("/bolsas"))
      await expect(page.getByRole("heading", { level: 1, name: "Bolsas" })).toBeVisible()
      await expectAt("/bolsas")

      await page.goto(at(`/busca?q=${encodeURIComponent("Bolsa Amora")}`))
      await expect(productCard()).toBeVisible()
      await expectAt("/busca")
    })

    /**
     * The one navigation the shop makes with the router and not the browser: a filter of the shelf
     * it is on. The router asks for the page's data at the address in the bar — which has no slug —
     * and the proxy has to answer that as it answers the page.
     */
    await test.step("a filter of the shelf is followed in place, with no full load, at an address with no slug", async () => {
      await page.goto(at("/produtos"))
      await page.evaluate(() => {
        ;(window as Window & { keptAcrossTheFilter?: boolean }).keptAcrossTheFilter = true
      })
      const data = page.waitForResponse((response) => {
        const url = new URL(response.url())
        return url.host === `${domain}:${port}` && url.pathname === "/produtos" && url.searchParams.has("_rsc") && url.searchParams.has("precoMin")
      })

      await page.locator('main a[href^="/produtos?precoMin="]').first().click()

      expect((await data).status()).toBe(200)
      await expect(page).toHaveURL(/\/produtos\?precoMin=\d+&precoMax=\d+$/)
      expect(await page.evaluate(() => (window as Window & { keptAcrossTheFilter?: boolean }).keptAcrossTheFilter)).toBe(true)
      await expect(productCard()).toBeVisible()
      await expectAt("/produtos")
    })

    await test.step("a product is reached by its link, and goes into the cart", async () => {
      await page.goto(at("/produtos"))
      await productCard().click()
      await expect(page).toHaveURL(at(`/produtos/${productSlug}`))
      await expect(page.getByRole("heading", { level: 1, name: productName })).toBeVisible()
      await expectAt(`/produtos/${productSlug}`)

      await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).first().click()
      // On the whole site: the cart's own page is `/carrinho`, where a cookie on the slug is never sent.
      await expect.poll(async () => (await context.cookies(at("/"))).find((cookie) => cookie.name === "bl_cart")?.path).toBe("/")
    })

    await test.step("the cart shows it, and still does after a reload", async () => {
      await page.goto(at("/carrinho"))
      await expect(page.getByText(productName).first()).toBeVisible()
      await expectAt("/carrinho")

      await page.reload()
      await expect(page.getByText(productName).first()).toBeVisible()
      await expectAt("/carrinho")
    })

    const customer = newEmail("cliente")

    await test.step("a customer opens an account there", async () => {
      await page.goto(at("/entrar?modo=criar"))
      await page.getByLabel("Nome", { exact: true }).fill("Bia Cliente")
      await page.getByLabel("E-mail", { exact: true }).fill(customer)
      await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
      await page.getByRole("button", { name: "Criar conta", exact: true }).click()

      await expect(page.getByText(`Enviamos um link para ${customer}`)).toBeVisible()
      await expectAt("/entrar")
    })

    await test.step("the e-mailed link, written with the platform's address, lands on the domain and confirms the account", async () => {
      const link = linkFrom((await waitForMessage(request, customer)).Text, "/confirmar-email")
      expect(new URL(link).host).toBe(`localhost:${port}`)

      await page.goto(link)
      await expect(page.getByText("E-mail confirmado! Entre para continuar.")).toBeVisible()
      await expectAt("/entrar")
    })

    await test.step("signs in by e-mail, and the session is the whole site's", async () => {
      await page.getByLabel("E-mail", { exact: true }).fill(customer)
      await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
      await page.getByRole("button", { name: "Entrar", exact: true }).click()

      await expect.poll(async () => (await context.cookies(at("/"))).find((cookie) => cookie.name === "bl_shopper_refresh")?.path).toBe("/")
      expect(new URL(page.url()).host).toBe(`${domain}:${port}`)
    })

    await test.step("the account opens for them, and the cart is still theirs", async () => {
      await page.goto(at("/conta"))
      // The page's own heading: the header greets them by the same words.
      await expect(page.getByRole("heading", { level: 1, name: "Olá, Bia" })).toBeVisible()
      await expectAt("/conta")

      await page.goto(at("/carrinho"))
      await expect(page.getByText(productName).first()).toBeVisible()
    })

    await test.step("signs out to the front door, and the account asks them to sign in again", async () => {
      await page.goto(at("/conta"))
      await page.getByRole("button", { name: "Sair", exact: true }).first().click()
      await expect(page).toHaveURL(at("/"))
      expect((await context.cookies(at("/"))).some((cookie) => cookie.name === "bl_shopper_refresh")).toBe(false)

      await page.goto(at("/conta"))
      await expect(page).toHaveURL(new RegExp(`^${at("/entrar")}\\?voltar=%2Fconta$`))
    })

    await test.step("an address with the slug, at the domain, leads to the same page without it", async () => {
      await page.goto(at(`/${slug}/produtos/${productSlug}?variant=x`))
      await expect(page).toHaveURL(at(`/produtos/${productSlug}?variant=x`))
    })

    await test.step("`www.` in front of the domain leads to the domain", async () => {
      await page.goto(`http://www.${domain}:${port}/carrinho`)
      await expect(page).toHaveURL(at("/carrinho"))
    })

    await test.step("the platform's address of the shop leads to the domain, path and query kept", async () => {
      await page.goto(`/${slug}`)
      await expect(page).toHaveURL(at("/"))

      await page.goto(`/${slug}/produtos?pagina=2`)
      await expect(page).toHaveURL(at("/produtos?pagina=2"))
    })

    await test.step("and the panel stays on the platform's host", async () => {
      await page.goto(`/admin/${slug}`)
      await expect(page).toHaveURL(new RegExp(`localhost:${port}/admin/${slug}$`))
    })
  })
})
