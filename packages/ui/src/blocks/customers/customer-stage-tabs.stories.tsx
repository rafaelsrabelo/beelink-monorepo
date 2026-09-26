// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CustomerStageTabs } from "./customer-stage-tabs"

const meta = {
  title: "Blocos/Clientes/Abas por estágio",
  component: CustomerStageTabs,
  parameters: { layout: "padded" },
  args: {
    value: null,
    onValueChange: () => {},
    counts: { LEAD: 42, CUSTOMER: 17, INACTIVE: 9 },
    children: <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">A lista da aba escolhida</p>,
  },
} satisfies Meta<typeof CustomerStageTabs>

export default meta
type Story = StoryObj<typeof meta>

/** Todos · Leads · Clientes · Inativos, cada aba com quantos há para a busca digitada. */
export const Todos: Story = {}

export const Inativos: Story = { args: { value: "INACTIVE" } }

/** Antes da primeira resposta: as abas sem número, em vez de um zero que não é verdade. */
export const SemContagem: Story = { args: { counts: undefined } }
