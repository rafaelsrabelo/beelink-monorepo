import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { VerifyEmailStatus } from "./verify-email-status"

const meta = {
  title: "Blocos/Autenticação/Confirmação de e-mail",
  component: VerifyEmailStatus,
  args: { onResend: fn() },
} satisfies Meta<typeof VerifyEmailStatus>

export default meta
type Story = StoryObj<typeof meta>

/** A skeleton, never a spinner — non-negotiable 3 of the root contract. */
export const Confirmando: Story = { args: { state: "checking" } }
export const Confirmado: Story = { args: { state: "verified" } }
export const LinkInvalido: Story = { args: { state: "invalid" } }
export const NovoLinkEnviado: Story = { args: { state: "invalid", resent: true } }
