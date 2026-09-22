// App
import { ProductScreen } from "@/components/catalog/product-screen"
import { getMessages } from "@/lib/locale"

/**
 * The products of one shop, as a list. It no longer reads the shop: the route word is only needed
 * by the form, which now lives on its own page and asks for it there.
 */
export default async function ProductsPage({ params }: PageProps<"/admin/[slug]/products">) {
  const { slug } = await params
  const { ui } = await getMessages()

  return <ProductScreen slug={slug} messages={ui} />
}
