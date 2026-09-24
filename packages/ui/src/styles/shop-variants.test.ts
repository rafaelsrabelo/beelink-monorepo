// Libs
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Read from the package's own folder, which is where its tests run: jsdom gives no file URL here.
const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8")

/**
 * jsdom evaluates neither media nor container queries, so what can be pinned is the rule itself:
 * each shop-* breakpoint is the viewport's on a page, and the `shop` container's only inside design
 * mode's preview. A container query on the page would move every threshold by a scrollbar's width.
 */
describe("the shop's breakpoints", () => {
  it.each([
    ["sm", "40rem"],
    ["md", "48rem"],
    ["lg", "64rem"],
    ["xl", "80rem"],
  ])("shop-%s is the viewport's %s on a page and the container's in the preview", (name, width) => {
    const variant = css.slice(css.indexOf(`@custom-variant shop-${name} {`)).split("\n}\n")[0]!

    expect(variant).toContain(`&:where(:not([data-shop-preview] *))`)
    expect(variant).toContain(`@media (width >= ${width})`)
    expect(variant).toContain(`&:where([data-shop-preview] *)`)
    expect(variant).toContain(`@container shop (width >= ${width})`)
  })
})
