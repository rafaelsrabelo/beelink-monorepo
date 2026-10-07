"use client"

// App
import { useCart } from "./cart-provider"
import { useTrack } from "./tracking/use-track"
import type { CartLine } from "@/lib/cart-cookie"

/** What the button knows of the thing it adds, beyond the ids the cart keeps: its name, and what one costs now. */
export interface AddedProduct {
  name: string
  unitPriceCents: number
}

/**
 * A product into the shop's cart, from any button that adds one — and the one place an "added to
 * cart" is told from (BEELINK-272). A quantity changed in the cart is not one, and neither is an
 * order bought again: the server fills that cart, and the page arrives at the checkout.
 */
export function useAddToCart(): (line: CartLine, product: AddedProduct) => void {
  const add = useCart((cart) => cart.add)
  const track = useTrack()

  return (line, product) => {
    add(line)
    track({ name: "AddToCart", item: { productId: line.productId, qty: line.qty, ...product } })
  }
}
