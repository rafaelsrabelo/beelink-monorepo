// App
import { ProductEditorScreen } from "@/components/catalog/product-editor-screen"
import { getMessages } from "@/lib/locale"

/**
 * A product that does not exist yet, on a page of its own.
 *
 * A page and not a panel above the list: a product carries photographs to upload and a
 * description to write, and a form that big inside a list is a form a stray click can throw away.
 */
export default async function NewProductPage({ params }: PageProps<"/admin/[slug]/products/new">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <ProductEditorScreen slug={slug} ui={ui} web={web} />
}
