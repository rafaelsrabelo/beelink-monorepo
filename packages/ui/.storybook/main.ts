import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  // The brands' marks on the Integrations blocks are the web app's files, handed to a block by prop:
  // served here from where they live, so a story draws the same mark the panel does.
  staticDirs: [{ from: "../../../apps/web/public/brand/integrations", to: "/brand/integrations" }],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes"],
  // No vite.config.ts in this package, so the builder's config is assembled here and nowhere else.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [react(), tailwindcss()] }),
}

export default config
