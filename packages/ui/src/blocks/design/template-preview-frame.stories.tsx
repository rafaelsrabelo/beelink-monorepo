// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { TemplatePreviewFrame } from "./template-preview-frame"

const meta = {
  title: "Blocos/Modo design/Galeria de modelos/Prévia de um modelo",
  component: TemplatePreviewFrame,
  args: { state: "ready", size: "card", children: <div className="bg-primary/15 text-primary grid h-80 place-items-center text-sm">A página do modelo</div> },
  decorators: [(Story) => <div className="bg-muted/40 w-96 overflow-hidden rounded-md"><Story /></div>],
} satisfies Meta<typeof TemplatePreviewFrame>

export default meta
type Story = StoryObj<typeof meta>

/** Desenhada: inerte e cortada na altura do cartão. */
export const Pronta: Story = {}

export const Carregando: Story = { args: { state: "loading" } }

export const Falhou: Story = { args: { state: "failed", onRetry: fn() } }

/** Com a frase da tela para o código que a API devolveu. */
export const FalhouComMotivo: Story = { args: { state: "failed", error: "Esse produto não é desta loja.", onRetry: fn() } }

export const PedeUmProduto: Story = { args: { state: "needsProduct" } }

export const SemPrevia: Story = { args: { state: "unavailable" } }

/** Ao lado da lista: a página inteira, sem corte. */
export const Grande: Story = { args: { size: "large" } }
