import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { SignupForm } from "./signup-form"

const meta = {
  title: "Blocos/Autenticação/Criar conta",
  component: SignupForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof SignupForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const EmailJaCadastrado: Story = {
  args: { error: "Este e-mail já está cadastrado." },
}

export const Enviando: Story = {
  args: { pending: true },
}
