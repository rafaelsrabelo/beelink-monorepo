// Block
import type { ProductCategoryOption } from "./product-form-types"
import { NEW_CATEGORY, type ProductImportRow } from "./product-import-types"

/** A small menu as the reader would leave it: one row without a price, one with flavours. */
export const importCategories: ProductCategoryOption[] = [
  { id: "0199a0f1-0000-7000-8000-0000000000c1", name: "Picolés" },
  { id: "0199a0f1-0000-7000-8000-0000000000c2", name: "Bebidas" },
]

export const importRows: ProductImportRow[] = [
  {
    key: "row-0",
    include: true,
    name: "Dindin gourmet",
    price: "4,00",
    categoryId: NEW_CATEGORY,
    newCategoryName: "Dindins",
    description: "Feito com leite integral.",
    option: {
      name: "Sabor",
      values: [
        { name: "Coco", priceCents: null },
        { name: "Nutella", priceCents: 650 },
      ],
    },
  },
  {
    key: "row-1",
    include: true,
    name: "Picolé de uva",
    price: "5,00",
    categoryId: "0199a0f1-0000-7000-8000-0000000000c1",
    newCategoryName: null,
    description: null,
    option: null,
  },
  {
    key: "row-2",
    include: true,
    name: "Suco de cajá",
    price: "",
    categoryId: "",
    newCategoryName: null,
    description: null,
    option: null,
  },
]
