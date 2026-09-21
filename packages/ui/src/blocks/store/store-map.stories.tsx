import type { Meta, StoryObj } from "@storybook/react-vite"

import { StoreMap } from "./store-map"

/**
 * Tiles need a key, and no key belongs in a repository. Storybook reads one from the environment
 * when there is one — `STORYBOOK_MAPTILER_KEY=… pnpm --filter @harness-monorepo/ui storybook` —
 * and without it the map draws its controls, its attribution and its pin over empty tiles, which
 * is exactly what a deployment with no key would show.
 */
// `import.meta.env` and not `process.env`: Storybook runs this in a browser through Vite, where
// there is no `process` — reaching for it renders "process is not defined" instead of a map.
// Cast because `import.meta.env` is Vite's, and this package's tsconfig does not pull Vite's
// types in for one story.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
const key = env?.STORYBOOK_MAPTILER_KEY ?? "sem-chave"
const tileUrl = `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${key}`

const meta = {
  title: "Blocos/Loja/Mapa",
  component: StoreMap,
  parameters: { layout: "padded" },
  args: {
    tileUrl,
    attribution:
      '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    fallbackCenter: { latitude: -14.235, longitude: -51.9253 },
    label: "Mapa mostrando onde fica a loja",
  },
} satisfies Meta<typeof StoreMap>

export default meta
type Story = StoryObj<typeof meta>

/** Before an address is picked: the country, and no pin. */
export const SemEndereco: Story = {}

/** Once a suggestion is picked, the map flies to it and drops the pin. */
export const ComEndereco: Story = {
  args: { point: { latitude: -3.7269, longitude: -38.5527 } },
}
