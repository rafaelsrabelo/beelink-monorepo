// Libs
import axe from "axe-core"
import { expect } from "vitest"

/**
 * Fails the test on any accessibility violation axe can see without layout. Colour contrast needs
 * real rendering, so it is off here and covered by Storybook's a11y panel and the Playwright run.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const { violations } = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  })

  expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
}
