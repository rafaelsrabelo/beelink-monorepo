import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { LoginForm } from "./login-form"

const meta = {
  title: "Blocos/Autenticação/Entrar",
  component: LoginForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** What the screen shows after the API answers AUTH_INVALID_CREDENTIALS. */
export const ComErroDoServidor: Story = {
  args: { error: "E-mail ou senha incorretos." },
}

/** An unverified account is refused with its own sentence, so the person knows what to do. */
export const EmailNaoConfirmado: Story = {
  args: { error: "Confirme seu e-mail antes de entrar. Enviamos um link quando você criou a conta." },
}

export const Enviando: Story = {
  args: { pending: true },
}
