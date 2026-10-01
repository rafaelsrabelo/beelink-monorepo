import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@harness-monorepo/ui/components/button"

import { AuthCard } from "./auth-card"
import { AuthShell } from "./auth-shell"

const meta = {
  title: "Blocos/Autenticação/Fundo",
  component: AuthShell,
  parameters: { layout: "fullscreen" },
  args: {
    children: (
      <AuthCard title="Entrar" description="Use o e-mail e a senha da sua conta">
        <Button className="w-full">Entrar</Button>
      </AuthCard>
    ),
  },
} satisfies Meta<typeof AuthShell>

export default meta
type Story = StoryObj<typeof meta>

/** O fundo da landing e a marca sobre o cartão. No tema escuro, o fundo é o do painel. */
export const Padrao: Story = {}
