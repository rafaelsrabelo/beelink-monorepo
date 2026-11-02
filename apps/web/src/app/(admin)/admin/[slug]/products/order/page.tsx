// App
import { ProductOrderScreen } from "@/components/catalog/product-order-screen"
import { getMessages } from "@/lib/locale"

/** The order the shop window shows the products in, chosen among all of them at once. */
export default async function ProductOrderPage({ params }: PageProps<"/admin/[slug]/products/order">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <ProductOrderScreen slug={slug} ui={ui} web={web} />
}
