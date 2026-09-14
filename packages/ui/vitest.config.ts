import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // Vitest 4 counts only imported files unless told otherwise — an untested block would hide.
      include: ["src/blocks/**/*.tsx"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.tsx"],
    },
  },
})
