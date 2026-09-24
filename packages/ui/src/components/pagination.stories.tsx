// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@harness-monorepo/ui/components/pagination"

const meta = {
  title: "Primitivos/Pagination",
  component: Pagination,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

/** As páginas de uma listagem, com os textos passados no idioma da loja. */
export const Padrao: Story = {
  render: () => (
    <Pagination aria-label="Páginas">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" text="Anterior" aria-label="Página anterior" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" text="Próxima" aria-label="Próxima página" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}
