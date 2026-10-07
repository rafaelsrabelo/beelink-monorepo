// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { AdminNavBadge } from "./admin-nav-badge"

const meta = {
  title: "Blocos/Admin/Selo do menu",
  component: AdminNavBadge,
  args: { count: 3 },
  decorators: [
    (Story) => (
      // The row a menu item draws it in: the badge is pushed to the row's end by its own margin.
      <div className="bg-shell text-shell-text relative flex w-56 items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px]">
        <span>Pedidos</span>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminNavBadge>

export default meta
type Story = StoryObj<typeof meta>

export const UmDigito: Story = {}

export const DoisDigitos: Story = { args: { count: 42 } }

/** Acima de 99 o selo para de contar: "99+" cabe na mesma caixa e não empurra o item. */
export const MaisDeNoventaENove: Story = { args: { count: 250 } }

/** Em zero não há selo: a linha fica exatamente como a de um item sem contagem. */
export const Zero: Story = { args: { count: 0 } }

/** Trilho recolhido (a partir de `lg`): o selo vai para o canto do ícone em vez de sumir. */
export const Recolhido: Story = { args: { count: 7, collapsed: true } }
