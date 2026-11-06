// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ProductImportReviewSkeleton } from "./product-import-review-skeleton"

const meta = {
  title: "Blocos/Catálogo/Importar produtos — lendo o documento",
  component: ProductImportReviewSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductImportReviewSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Lendo: Story = {}
