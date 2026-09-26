// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Locales
import { en } from "../../locales/en"

// Block
import { BesideActions } from "./beside-actions"

const meta = {
  title: "Blocos/Modo design/Lado a lado",
  component: BesideActions,
  parameters: { layout: "padded" },
  args: { name: "Banner de verão", onAddBeside: fn() },
} satisfies Meta<typeof BesideActions>

export default meta
type Story = StoryObj<typeof meta>

/** Um bloco com espaço na linha: o bloco novo entra ao lado, com a largura que cabe. */
export const AdicionarAoLado: Story = {}

/**
 * Um bloco sozinho na faixa, embaixo de outro com espaço na linha: ele sobe para o lado do de cima,
 * com as fotos que já tem, e a faixa que fica vazia some.
 */
export const PorAoLadoDoDeCima: Story = {
  args: { joinAbove: { name: "Banner de inverno", onJoin: fn() } },
}

export const EmIngles: Story = {
  args: { joinAbove: { name: "Winter banner", onJoin: fn() }, messages: en },
}
