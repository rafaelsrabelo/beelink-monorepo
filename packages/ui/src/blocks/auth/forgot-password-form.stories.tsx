import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { ForgotPasswordForm } from "./forgot-password-form"

const meta = {
  title: "Blocos/Autenticação/Esqueci a senha",
  component: ForgotPasswordForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof ForgotPasswordForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The same screen for an address with an account and one without: it never tells them apart. */
export const Enviado: Story = {
  args: { sent: true },
}
