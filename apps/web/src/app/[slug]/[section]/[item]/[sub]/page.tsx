// Next
import type { Metadata } from "next"

// App
import { OrderPage, orderPageMetadata } from "@/components/storefront/account/order-page"

/**
 * A fourth segment, for one thing only: an order of the shopper's, at `/<shop>/conta/pedidos/<n>`.
 * Anything else four segments deep — under a category, a product, another tab — is a 404.
 */
export async function generateMetadata({ params }: PageProps<"/[slug]/[section]/[item]/[sub]">): Promise<Metadata> {
  return orderPageMetadata(await params)
}

export default async function AccountOrderPage({ params, searchParams }: PageProps<"/[slug]/[section]/[item]/[sub]">) {
  return <OrderPage {...(await params)} query={await searchParams} />
}
