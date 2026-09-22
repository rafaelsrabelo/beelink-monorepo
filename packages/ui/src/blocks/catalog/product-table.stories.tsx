// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { ProductTable, type ProductTableItem } from "./product-table"

const products: ProductTableItem[] = [
  {
    id: "1",
    name: "Whey Concentrado 900g",
    sku: "WHEY-900",
    priceCents: 13990,
    compareAtPriceCents: 16900,
    imageUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=96&h=96&fit=crop",
    categoryName: "Proteínas",
    status: "ACTIVE",
    soldOut: false,
    origin: "RESALE",
    trackStock: true,
    stockQuantity: 12,
    viewHref: "https://bee.link/mutante/produtos/whey",
  },
  {
    id: "2",
    name: "Blusa de crochê tomara que caia",
    sku: "BLS-014",
    priceCents: 18900,
    compareAtPriceCents: null,
    imageUrl: null,
    categoryName: "Blusas",
    status: "ACTIVE",
    soldOut: false,
    origin: "IN_HOUSE",
    trackStock: false,
    stockQuantity: null,
    viewHref: "https://bee.link/lessari/produtos/blusa",
  },
  {
    id: "3",
    name: "Creatina Monohidratada",
    sku: null,
    priceCents: 8990,
    compareAtPriceCents: null,
    imageUrl: null,
    categoryName: null,
    status: "DRAFT",
    soldOut: false,
    origin: null,
    trackStock: true,
    stockQuantity: 0,
    viewHref: null,
  },
]

const meta = {
  title: "Blocos/Catálogo/Tabela de produtos",
  component: ProductTable,
  parameters: { layout: "padded" },
  args: { products, onEdit: () => {}, onDelete: () => {} },
} satisfies Meta<typeof ProductTable>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The four rows are the four states the columns exist to tell apart: one counted and in stock, one
 * made to order and never counted, one draft, and one active whose shelf is empty. A table where
 * every row looks the same proves nothing about the table.
 */
export const Padrao: Story = {
  args: {
    products: [
      ...products,
      {
        id: "4",
        name: "Creatina Monohidratada 300g",
        sku: "CRE-300",
        priceCents: 8990,
        compareAtPriceCents: null,
        imageUrl: null,
        categoryName: "Proteínas",
        status: "ACTIVE",
        soldOut: true,
        origin: "RESALE",
        trackStock: true,
        stockQuantity: 0,
        viewHref: "https://bee.link/mutante/produtos/creatina",
      },
    ],
  },
}

export const Vazia: Story = { args: { products: [] } }

/** While a row is being deleted, its two buttons go quiet rather than taking a second click. */
export const Ocupada: Story = { args: { busyId: "2" } }

export const EmIngles: Story = { args: { messages: en, locale: "en-US", currency: "USD" } }
