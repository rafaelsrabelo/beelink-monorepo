import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontPagination } from "./storefront-pagination"

const meta = {
  title: "Blocos/Vitrine/Paginação",
  component: StorefrontPagination,
  parameters: { layout: "padded" },
  args: {
    page: 3,
    pageCount: 12,
    href: (page: number) => `/lessari/produtos?pagina=${page}`,
  },
  // The current page is painted in the shop's own colours, and outside a shop window nothing
  // defines them — without this the pill is a hole.
  decorators: [
    (Story) => (
      <div style={{ "--shop-primary": "oklch(0.55 0.18 15)", "--shop-background": "oklch(1 0 0)" } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontPagination>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** No page before the first one, so there is no "Anterior" — not a greyed one. */
export const PrimeiraPagina: Story = {
  args: { page: 1 },
}

export const UltimaPagina: Story = {
  args: { page: 12 },
}

/** Forty pages, and still eight entries: first, last, current and its neighbours. */
export const CatalogoGrande: Story = {
  args: { page: 20, pageCount: 40 },
}

/** Four pages from the edge: the "…" would be hiding a single digit, so it writes it out. */
export const ReticenciaQueNaoVale: Story = {
  args: { page: 4, pageCount: 40 },
}

export const DuasPaginas: Story = {
  args: { page: 1, pageCount: 2 },
}

/** One page is not a choice: the block renders nothing, and the story is the proof. */
export const PaginaUnica: Story = {
  args: { page: 1, pageCount: 1 },
}
