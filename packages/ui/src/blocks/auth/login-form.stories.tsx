import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
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

/**
 * An unverified account is refused with its own sentence, and a new link is one click away — the
 * first one may never have arrived.
 */
export const EmailNaoConfirmado: Story = {
  args: {
    error: "Confirme seu e-mail antes de entrar. Enviamos um link quando você criou a conta.",
    resend: { onResend: fn() },
  },
}

/** The new link is on its way: said where the button was. */
export const NovoLinkEnviado: Story = {
  args: {
    error: "Confirme seu e-mail antes de entrar. Enviamos um link quando você criou a conta.",
    resend: { onResend: fn(), sent: true },
  },
}

export const Enviando: Story = {
  args: { pending: true },
}

/** The same block, handed the English dictionary. Nothing else changes. */
export const EmIngles: Story = {
  args: { messages: en },
}
