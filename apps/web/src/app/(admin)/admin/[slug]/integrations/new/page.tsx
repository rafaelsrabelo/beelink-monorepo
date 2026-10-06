// Libs
import { redirect } from "next/navigation"

// App
import { integrationPagesOf } from "@/lib/integration-pages"

/**
 * "Nova integração" was a page of its own until the list began showing every third party there is.
 * The address still answers, for whoever kept it: it leads to the list, where connecting now is.
 */
export default async function NewIntegrationPage({ params }: PageProps<"/admin/[slug]/integrations/new">) {
  const { slug } = await params

  redirect(integrationPagesOf(slug).list as Parameters<typeof redirect>[0])
}
