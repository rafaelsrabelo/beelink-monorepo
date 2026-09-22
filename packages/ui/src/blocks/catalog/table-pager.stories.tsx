// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { TablePager } from "./table-pager"

const meta = {
  title: "Blocos/Catálogo/Paginador",
  component: TablePager,
  parameters: { layout: "padded" },
  args: { page: 1, pageSize: 20, total: 137, onPageChange: () => {} },
  render: function Live(args) {
    const [page, setPage] = useState(args.page)

    return <TablePager {...args} page={page} onPageChange={setPage} />
  },
} satisfies Meta<typeof TablePager>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The last page is short, and the range says so rather than rounding up to the page size. */
export const UltimaPagina: Story = { args: { page: 7 } }

/** Nothing is drawn: a pager under a list with no second page is furniture that does nothing. */
export const PaginaUnica: Story = { args: { total: 12 } }

export const Carregando: Story = { args: { page: 3, busy: true } }
