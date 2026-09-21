// App
import { CategoryScreen } from "@/components/catalog/category-screen"
import { getMessages } from "@/lib/locale"

/**
 * The categories of one shop.
 *
 * A thin screen over a client component, like every other page in the panel: the shell is already
 * signed in by `(admin)/layout.tsx`, and everything this page does with the network happens in
 * TanStack Query hooks behind it.
 */
export default async function CategoriesPage({ params }: PageProps<"/admin/[slug]/categories">) {
  const { slug } = await params
  const { ui } = await getMessages()

  return <CategoryScreen slug={slug} messages={ui} />
}
