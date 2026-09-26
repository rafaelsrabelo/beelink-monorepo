// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Locales
import { en } from "../../locales/en"

// Block
import { VisibleOnField } from "./visible-on-field"

const meta = {
  title: "Blocos/Modo design/Aparece em",
  component: VisibleOnField,
  parameters: { layout: "padded" },
  args: { value: "ALL", onChange: fn() },
} satisfies Meta<typeof VisibleOnField>

export default meta
type Story = StoryObj<typeof meta>

/** Em todo lugar: as duas telas ligadas. */
export const EmTodoLugar: Story = {}

/** Só no computador: um banner largo demais para o celular, por exemplo. */
export const SoNoComputador: Story = { args: { value: "DESKTOP" } }

/** A última tela ligada não desliga: para tirar de todo lugar, é o Ocultar. */
export const SoNoCelular: Story = { args: { value: "PHONE" } }

export const EmIngles: Story = { args: { messages: en } }
