import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  // The web app's brand files, served here from where they live: the marks on the Integrations
  // blocks, handed to a block by prop, and bee-link's picture for a product with none
  // (src/lib/product-image.ts) — so a story draws what the panel and the shop window do.
  staticDirs: [{ from: "../../../apps/web/public/brand", to: "/brand" }],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes"],
  // No vite.config.ts in this package, so the builder's config is assembled here and nowhere else.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [react(), tailwindcss()] }),
}

export default config
