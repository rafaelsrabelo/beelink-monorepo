// Libs
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// Support
import { standInForGoogle } from "./support/google-tag"

/**
 * The landing's cookie notice (BEELINK-319), in a real browser: where it stands, what it writes and
 * for how long, and that a keyboard alone answers it.
 *
 * The suite's web is started with a measurement ID (`playwright.config.ts`), which is what makes the
 * landing ask at all. A landing with no ID is held by `site-consent-gate.test.tsx`: one server cannot
 * be both.
 *
 * Since BEELINK-320 a yes makes the page ask Google for its script. Google is stood in for in every
 * test here, so none of them reaches it; what is asked of it, and when, is `site-analytics.spec.ts`.
 */

test.beforeEach(async ({ context }) => {
  await standInForGoogle(context)
})

const DAY = 24 * 60 * 60

/** The notice's heading as the server writes it. Its sentences travel in the page either way, for the browser to draw it again. */
const NOTICE_HEADING = ">Cookies de medição</h2>"

const notice = (page: Page) => page.getByRole("region", { name: "Cookies de medição" })
const reopen = (page: Page) => page.getByRole("button", { name: "Cookies" })

async function answerOf(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === "bl_site_consent")
}

/**
 * The landing, once its script has run. The server draws the notice, but its buttons and the
 * footer's answer to nothing until the page is hydrated — and a key pressed before that is lost.
 */
async function openLanding(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" })
}

/** Where the notice and the footer stand on the screen, to tell whether one covers the other. */
async function boxesOf(page: Page) {
  const [strip, footer] = await Promise.all([notice(page).boundingBox(), page.locator("footer").boundingBox()])
  return { noticeTop: strip!.y, noticeBottom: strip!.y + strip!.height, footerBottom: footer!.y + footer!.height, screen: page.viewportSize()!.height }
}

test.describe("the landing's cookie notice", () => {
  test("asks a visitor who has not answered, at the foot of the screen, and writes nothing until they do", async ({ page }) => {
    await openLanding(page)

    await expect(notice(page)).toBeVisible()
    expect(await (await page.request.get("/")).text()).toContain(NOTICE_HEADING)
    await expect(notice(page).getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade")
    await expect(notice(page).getByRole("button")).toHaveText(["Recusar", "Aceitar"])
    await expect(page.getByRole("dialog")).toHaveCount(0)

    const { noticeBottom, screen } = await boxesOf(page)
    expect(Math.abs(noticeBottom - screen)).toBeLessThan(1)
    expect(await answerOf(page)).toBeUndefined()
  })

  test("draws a no exactly as it draws a yes", async ({ page }) => {
    await openLanding(page)

    const [refuse, accept] = await Promise.all(["Recusar", "Aceitar"].map((name) => notice(page).getByRole("button", { name }).boundingBox()))
    expect(refuse!.width).toBe(accept!.width)
    expect(refuse!.height).toBe(accept!.height)
    expect(refuse!.y).toBe(accept!.y)

    const look = (name: string) =>
      notice(page)
        .getByRole("button", { name })
        .evaluate((button) => {
          const style = getComputedStyle(button)
          return [style.backgroundColor, style.color, style.borderTopColor, style.borderTopWidth, style.fontWeight, style.fontSize].join("|")
        })
    expect(await look("Recusar")).toBe(await look("Aceitar"))
  })

  for (const [button, value, said] of [
    ["Recusar", "denied", "Escolha salva: você recusou os cookies de medição da Beelink."],
    ["Aceitar", "granted", "Escolha salva: você aceitou os cookies de medição da Beelink."],
  ] as const) {
    test(`keeps "${button}" as ${value} for half a year on the whole site, says so, and does not ask at the next visit`, async ({ page }) => {
      await openLanding(page)
      await notice(page).getByRole("button", { name: button }).click()

      await expect(notice(page)).toHaveCount(0)
      await expect(page.getByRole("status").filter({ hasText: said })).toHaveCount(1)

      const cookie = (await answerOf(page))!
      expect(cookie).toMatchObject({ value, path: "/", sameSite: "Lax", httpOnly: false })
      const days = (cookie.expires - Date.now() / 1000) / DAY
      expect(days).toBeGreaterThan(179.9)
      expect(days).toBeLessThanOrEqual(180)

      // The server reads the answer: the page arrives without the notice, rather than dropping it once the script runs.
      const html = await (await page.request.get("/")).text()
      expect(html).not.toContain(NOTICE_HEADING)

      await page.reload()
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(notice(page)).toHaveCount(0)
    })
  }

  test("is the first thing a keyboard reaches, and is answered by it alone", async ({ page }) => {
    await openLanding(page)

    await page.keyboard.press("Tab")
    await expect(notice(page).getByRole("link", { name: "política de privacidade" })).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(notice(page).getByRole("button", { name: "Recusar" })).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(notice(page).getByRole("button", { name: "Aceitar" })).toBeFocused()

    // It holds nobody: the next stop is the page's own first link.
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: "Beelink, início" })).toBeFocused()

    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Enter")

    await expect(notice(page)).toHaveCount(0)
    expect((await answerOf(page))?.value).toBe("denied")
  })

  test("opens again from the footer with the answer in force, takes the focus, and gives it back", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "bl_site_consent", value: "granted", url: baseURL! }])
    await openLanding(page)
    await expect(notice(page)).toHaveCount(0)

    await reopen(page).focus()
    await page.keyboard.press("Enter")

    await expect(notice(page)).toBeFocused()
    await expect(notice(page)).toContainText("Sua escolha atual: você aceitou.")

    // From the region: its link, then a no.
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await expect(notice(page).getByRole("button", { name: "Recusar" })).toBeFocused()
    await page.keyboard.press("Enter")

    await expect(notice(page)).toHaveCount(0)
    await expect(reopen(page)).toBeFocused()
    expect((await answerOf(page))?.value).toBe("denied")
  })

  test("takes neither a shop's answer nor an edited cookie for its own", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "bl_consent", value: "granted", url: baseURL! }])
    await openLanding(page)
    await expect(notice(page)).toBeVisible()

    await context.clearCookies()
    await context.addCookies([{ name: "bl_site_consent", value: "yes", url: baseURL! }])
    await openLanding(page)
    await expect(notice(page)).toBeVisible()
  })

  test("rests under the footer at the page's end, covering none of it", async ({ page }) => {
    await openLanding(page)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

    await expect.poll(async () => Math.abs((await boxesOf(page)).noticeBottom - (await boxesOf(page)).screen)).toBeLessThan(1)
    const { noticeTop, footerBottom } = await boxesOf(page)
    expect(footerBottom).toBeLessThanOrEqual(noticeTop + 0.5)
  })

  test("leaves the sign-in and the sign-up asking nothing", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path, { waitUntil: "networkidle" })

      await expect(page.getByLabel("E-mail")).toBeVisible()
      await expect(notice(page)).toHaveCount(0)
      await expect(reopen(page)).toHaveCount(0)
    }
    expect(await answerOf(page)).toBeUndefined()
  })

  test("asks before anything leaves the site, and nothing leaves after a no", async ({ page, baseURL }) => {
    const elsewhere: string[] = []
    page.on("request", (request) => {
      if (!request.url().startsWith(baseURL!)) elsewhere.push(request.url())
    })

    await openLanding(page)
    await expect(notice(page)).toBeVisible()
    await notice(page).getByRole("button", { name: "Recusar" }).click()
    await page.reload()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    expect(elsewhere).toEqual([])
  })

  // Contrast needs a real layout: here the notice is on the page it was drawn for.
  test("has no accessibility violations while it stands, asked for the first time or again", async ({ page, context, baseURL }) => {
    const audit = async () => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((violation) => `${violation.id}: ${violation.help}`)

    await openLanding(page)
    await expect(notice(page)).toBeVisible()
    expect(await audit()).toEqual([])

    await context.addCookies([{ name: "bl_site_consent", value: "denied", url: baseURL! }])
    await openLanding(page)
    await reopen(page).click()
    await expect(notice(page)).toContainText("Sua escolha atual: você recusou.")
    expect(await audit()).toEqual([])
  })
})

test.describe("the landing's cookie notice, on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("stands at the foot without widening the page, its two answers side by side", async ({ page }) => {
    await openLanding(page)

    const [refuse, accept] = await Promise.all(["Recusar", "Aceitar"].map((name) => notice(page).getByRole("button", { name }).boundingBox()))
    expect(refuse!.y).toBe(accept!.y)
    expect(refuse!.width).toBe(accept!.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })

  test("stays out of the way of the page's own buttons: the couriers' form is sent, and the hero's link followed, with it standing", async ({ page }) => {
    await openLanding(page)

    // The form's button is locked until the form is filled in (BEELINK-322), and the send is answered here: this is about the press.
    await page.route("**/api/courier-applications", (route) => route.fulfill({ status: 204 }))
    const form = page.getByRole("form", { name: "Comece seu cadastro" })
    // By its whole label: the acceptance's own sentence names the CPF, the e-mail and the WhatsApp too.
    const field = (label: string) => form.getByLabel(label, { exact: true })
    await field("Nome completo").fill("Zuleica Tavares")
    await field("CPF").fill("52998224725")
    await field("E-mail").fill("zuleica.tavares@exemplo.test")
    await field("WhatsApp").fill("85987654321")
    await form.getByRole("checkbox").check()
    await form.getByRole("button", { name: "Enviar cadastro" }).click()
    await expect(page.getByRole("group", { name: "Cadastro recebido." })).toBeVisible()
    await expect(notice(page)).toBeVisible()

    await page.getByRole("link", { name: "Começar agora" }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  // Whatever Tab reaches is scrolled above the notice, never left behind it.
  test("never leaves a focused control behind it", async ({ page }) => {
    await openLanding(page)
    const hidden: string[] = []

    for (let stop = 0; stop < 60; stop += 1) {
      await page.keyboard.press("Tab")
      const seen = await notice(page).evaluate((strip) => {
        const element = document.activeElement
        if (!element || element === document.body) return null
        const box = element.getBoundingClientRect()
        const top = strip.getBoundingClientRect().top
        // A control taller than what is left of the screen cannot stand clear of it; one that fits must.
        const fits = box.height <= top
        return { name: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40), behind: !strip.contains(element) && fits && box.bottom > top + 4 }
      })
      if (!seen) break
      if (seen.behind) hidden.push(seen.name)
      if (seen.name === "Cookies") break
    }

    expect(hidden).toEqual([])
  })
})

/**
 * A keyboard inside the notice, and what the page does meanwhile: nothing. The document keeps the
 * notice's height clear at its foot for whatever Tab reaches on the page — and the notice's own
 * controls stand exactly there. Taken for hidden, each one had the page scrolled to bring it up, and
 * the notice, which follows the screen, came along: a visitor who answered by keyboard ended a
 * thousand pixels down the page.
 */
const pageTop = (page: Page) => page.evaluate(() => new Promise<number>((resolve) => requestAnimationFrame(() => resolve(Math.round(window.scrollY)))))

for (const [screen, viewport] of [
  ["a wide screen", { width: 1280, height: 800 }],
  ["a phone", { width: 390, height: 844 }],
] as const) {
  test.describe(`the landing's cookie notice under a keyboard, on ${screen}`, () => {
    test.use({ viewport })

    for (const [where, top] of [
      ["at its top", 0],
      ["scrolled to its middle", 3000],
    ] as const) {
      test(`leaves the page ${where} where it is while Tab and Shift+Tab walk through it`, async ({ page }) => {
        await openLanding(page)
        await page.evaluate((to) => window.scrollTo({ top: to, behavior: "instant" }), top)
        expect(await pageTop(page)).toBe(top)

        const walked: [string, number][] = []
        for (const [key, stop] of [
          ["Tab", "política de privacidade"],
          ["Tab", "Recusar"],
          ["Tab", "Aceitar"],
          ["Shift+Tab", "Recusar"],
          ["Shift+Tab", "política de privacidade"],
        ] as const) {
          await page.keyboard.press(key)
          await expect(notice(page).getByText(stop, { exact: true })).toBeFocused()
          walked.push([stop, await pageTop(page)])
        }

        expect(walked).toEqual([
          ["política de privacidade", top],
          ["Recusar", top],
          ["Aceitar", top],
          ["Recusar", top],
          ["política de privacidade", top],
        ])
      })
    }

    test("opened again from the footer, takes the focus and leaves the page where it was", async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: "bl_site_consent", value: "denied", url: baseURL! }])
      await openLanding(page)
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }))
      await reopen(page).focus()
      const top = await pageTop(page)

      await page.keyboard.press("Enter")
      await expect(notice(page)).toBeFocused()
      expect(await pageTop(page)).toBe(top)

      for (const stop of ["política de privacidade", "Recusar", "Aceitar"]) {
        await page.keyboard.press("Tab")
        await expect(notice(page).getByText(stop, { exact: true })).toBeFocused()
        expect(await pageTop(page), `with the focus on "${stop}"`).toBe(top)
      }

      // The page is longer by the notice now: it stands over the footer's last lines until the page is taken to its new end.
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }))
      await expect.poll(async () => (await boxesOf(page)).footerBottom - (await boxesOf(page)).noticeTop).toBeLessThanOrEqual(0.5)
    })

    // The room kept clear is for the page's controls, and is still kept once the focus is back among them.
    test("still keeps the page's own controls clear of it once the keyboard walks on", async ({ page }) => {
      await openLanding(page)
      const room = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0)
      const height = Math.round((await notice(page).boundingBox())!.height)

      expect(Math.round(await room())).toBe(height)
      await page.keyboard.press("Tab")
      await expect(notice(page).getByRole("link", { name: "política de privacidade" })).toBeFocused()
      expect(await room()).toBe(0)

      await page.keyboard.press("Tab")
      await page.keyboard.press("Tab")
      await page.keyboard.press("Tab")
      await expect(page.getByRole("link", { name: "Beelink, início" })).toBeFocused()
      expect(Math.round(await room())).toBe(height)
    })
  })
}

