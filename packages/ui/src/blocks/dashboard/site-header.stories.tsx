import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@harness-monorepo/ui/components/button"
import { SidebarProvider } from "@harness-monorepo/ui/components/sidebar"

import { SiteHeader } from "./site-header"

const meta = {
  title: "Blocos/Painel/Cabeçalho",
  component: SiteHeader,
  parameters: { layout: "fullscreen" },
  args: { title: "Painel" },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="w-full [--header-height:--spacing(12)]">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof SiteHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The right-hand side is the screen's: a button, a badge, a language switcher. */
export const ComAcoes: Story = {
  args: {
    title: "Minhas lojas",
    actions: <Button size="sm">Criar loja</Button>,
  },
}

export const TituloLongo: Story = {
  args: { title: "Configurações da loja Doces da Ana — informações básicas" },
}
