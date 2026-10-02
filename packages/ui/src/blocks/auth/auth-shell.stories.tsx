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

/** A stand-in for the brand's photographs, which the app draws with its own optimised image. */
const photo = (seed: string) => <img key={seed} src={`https://picsum.photos/seed/beelink-${seed}/1024/1536`} alt="" className="absolute inset-0 size-full object-cover" />

/** Com uma foto da marca ao lado, numa tela larga; no celular, só o formulário. */
export const ComFoto: Story = {
  args: { photos: [photo("auth")] },
}

/** Com duas ou mais, elas passam como um carrossel, sem setas e com as bolinhas embaixo. */
export const ComFotos: Story = {
  args: { photos: ["muro", "moto", "ponto"].map(photo) },
}
