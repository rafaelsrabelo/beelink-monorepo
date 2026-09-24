import { withThemeByClassName } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react-vite"
import { createElement } from "react"

import "../src/styles/globals.css"

/**
 * The shop window's blocks answer the `shop` container rather than the browser (`shop-sm:` and the
 * rest, in globals.css), and StorefrontWindow is that container on a page. A block drawn alone has
 * none around it, so every one of its breakpoints would stay closed and every story would be a
 * phone. The canvas's width is the window here.
 */
const withShopContainer: Decorator = (Story, context) =>
  context.title.startsWith("Blocos/Vitrine")
    ? createElement("div", { className: "@container/shop w-full" }, createElement(Story))
    : createElement(Story)

const preview: Preview = {
  parameters: {
    // A violation fails the story, in the panel and in CI — not a warning someone scrolls past.
    a11y: { test: "error" },
    layout: "centered",
  },
  decorators: [
    withShopContainer,
    withThemeByClassName({
      themes: { claro: "", escuro: "dark" },
      defaultTheme: "claro",
    }),
  ],
}

export default preview
