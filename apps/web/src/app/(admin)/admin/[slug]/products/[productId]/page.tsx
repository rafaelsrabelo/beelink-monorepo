// App
import { ProductEditorScreen } from "@/components/catalog/product-editor-screen"
import { getMessages } from "@/lib/locale"

/** One product, as its owner edits it. The same screen as `new`, with something to load first. */
export default async function EditProductPage({
  params,
}: PageProps<"/admin/[slug]/products/[productId]">) {
  const { slug, productId } = await params
  const { ui, web } = await getMessages()

  return <ProductEditorScreen slug={slug} productId={productId} ui={ui} web={web} />
}
