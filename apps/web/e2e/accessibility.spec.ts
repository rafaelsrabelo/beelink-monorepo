// Libs
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * The component tests run axe in jsdom, which has no layout and therefore cannot judge colour
 * contrast. Here the pages are real, so contrast counts too.
 */
const SIGNED_OUT_PAGES = ["/login", "/signup", "/forgot-password", "/verify-email"]

for (const path of SIGNED_OUT_PAGES) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path)

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()

    expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
  })
}
