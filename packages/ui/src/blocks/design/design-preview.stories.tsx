// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { DesignPreview } from "./design-preview"

const meta = {
  title: "Blocos/Modo design/Preview",
  component: DesignPreview,
  parameters: { layout: "padded" },
  args: {
    children: (
      <div className="flex flex-col gap-4 p-6">
        <div className="bg-muted h-40 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_unused, at) => (
            <div key={at} className="bg-muted flex h-32 items-center justify-center rounded-xl">
              {at + 1}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md rounded-xl border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DesignPreview>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A prova de que isto não é um `@container`: o conteúdo é desenhado com 1440 px de largura e
 * depois reduzido, então `lg:grid-cols-4` continua valendo dentro de um painel de 400 px. É por
 * isso que quatro colunas aparecem aqui — a vitrine dimensiona contra a janela, não contra a caixa.
 *
 * E é também por isso que não existe uma história "Celular": a media query responde à janela, que
 * a largura da superfície não muda. Uma superfície de 390 px desenharia o layout de desktop
 * espremido, não um celular. O comentário do bloco traz a medição.
 */
export const Computador: Story = {}
