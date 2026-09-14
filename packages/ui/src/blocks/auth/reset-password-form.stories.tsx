import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { ResetPasswordForm } from "./reset-password-form"

const meta = {
  title: "Blocos/Autenticação/Nova senha",
  component: ResetPasswordForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof ResetPasswordForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const LinkExpirado: Story = {
  args: { error: "Este link expirou ou já foi usado. Peça um novo." },
}
