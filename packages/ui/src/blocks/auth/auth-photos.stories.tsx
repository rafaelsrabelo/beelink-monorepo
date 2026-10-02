import type { Meta, StoryObj } from "@storybook/react-vite"

import { ptBR } from "@harness-monorepo/ui/locales/index"

import { AuthPhotos } from "./auth-photos"

/** A stand-in for the brand's photographs, which the app draws with its own optimised image. */
const photos = ["muro", "moto", "ponto"].map((seed) => (
  <img key={seed} src={`https://picsum.photos/seed/beelink-${seed}/1024/1536`} alt="" className="absolute inset-0 size-full object-cover" />
))

const meta = {
  title: "Blocos/Autenticação/Fotos",
  component: AuthPhotos,
  parameters: { layout: "fullscreen" },
  args: { photos, label: ptBR.landing.auth.label, position: ptBR.landing.auth.position },
  decorators: [
    (Story) => (
      <div className="relative h-svh w-full max-w-2xl bg-brand-ink">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthPhotos>

export default meta
type Story = StoryObj<typeof meta>

/** As fotos passam sozinhas, sem setas: as bolinhas dizem qual está na tela e levam a qualquer uma. Param sob o ponteiro e com o foco numa bolinha. */
export const Padrao: Story = {}

/** Mais devagar ou mais depressa: `pace`, em milissegundos. */
export const Depressa: Story = { args: { pace: 2000 } }
