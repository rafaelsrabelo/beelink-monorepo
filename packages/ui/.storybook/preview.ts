import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview } from "@storybook/react-vite"

import "../src/styles/globals.css"

const preview: Preview = {
  parameters: {
    // A violation fails the story, in the panel and in CI — not a warning someone scrolls past.
    a11y: { test: "error" },
    layout: "centered",
  },
  decorators: [
    withThemeByClassName({
      themes: { claro: "", escuro: "dark" },
      defaultTheme: "claro",
    }),
  ],
}

export default preview
