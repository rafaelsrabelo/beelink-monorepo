import type { Meta, StoryObj } from "@storybook/react-vite"

import { AnchorLink } from "./auth-link"

const meta = {
  title: "Blocos/Autenticação/Link injetado",
  component: AnchorLink,
  args: { href: "/cadastro", children: "Criar conta" },
} satisfies Meta<typeof AnchorLink>

export default meta
type Story = StoryObj<typeof meta>

/** What every block navigates with until an app passes its own — Storybook keeps this one. */
export const Padrao: Story = {}

/**
 * A primitive marks the current page by injecting `aria-current` into whatever link it was given.
 * A link component that dropped the extra props would lose that, and only the styling would show it.
 */
export const PaginaAtual: Story = {
  args: { "aria-current": "page", href: "/dashboard", children: "Painel" },
}
