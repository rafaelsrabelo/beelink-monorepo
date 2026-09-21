// App
import { ProductScreen } from "@/components/catalog/product-screen"
import { getMessages } from "@/lib/locale"
import { shopAt } from "@/lib/storefront-data"

/**
 * The products of one shop.
 *
 * It reads the shop for one reason: the word its product URLs are built from. The form shows the
 * address a product will live at, and `routeWords` is where that word comes from — spelling
 * "produtos" here would be the literal the whole route scheme exists to keep out of the app.
 */
export default async function ProductsPage({ params }: PageProps<"/admin/[slug]/products">) {
  const { slug } = await params
  const [{ ui }, store] = await Promise.all([getMessages(), shopAt(slug)])

  return (
    <ProductScreen slug={slug} productsWord={store?.routeWords.products ?? ""} messages={ui} />
  )
}
