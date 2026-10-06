// Libs
import { CheckIcon } from "lucide-react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

const meta = {
  title: "Primitivos/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  args: { children: "Selo" },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Padrão</Badge>
      <Badge variant="secondary">Sandbox</Badge>
      <Badge variant="success">Conectado</Badge>
      <Badge variant="destructive">Precisa reconectar</Badge>
      <Badge variant="outline">Não conectado</Badge>
    </div>
  ),
}

/** O verde de algo que deu certo e continua valendo, com o ícone que o diz sem depender da cor. */
export const Sucesso: Story = {
  render: () => (
    <Badge variant="success">
      <CheckIcon aria-hidden="true" />
      Conectado
    </Badge>
  ),
}
