import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes"],
  // No vite.config.ts in this package, so the builder's config is assembled here and nowhere else.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [react(), tailwindcss()] }),
}

export default config
