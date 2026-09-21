import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@harness-monorepo/ui/components/button"

import { AuthCard } from "./auth-card"

const meta = {
  title: "Blocos/Autenticação/Moldura",
  component: AuthCard,
  args: {
    title: "Entrar",
    description: "Use o e-mail e a senha da sua conta",
    children: <Button className="w-full">Entrar</Button>,
  },
} satisfies Meta<typeof AuthCard>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The one place the server's answer lands, whichever auth screen is inside the frame. */
export const ComErroDoServidor: Story = {
  args: { error: "E-mail ou senha incorretos." },
}

/** The footer sits outside the card, on the layout's muted background. */
export const ComRodape: Story = {
  args: {
    footer: (
      <>
        Ainda não tem conta? <a href="/cadastro">Criar conta</a>
      </>
    ),
  },
}
