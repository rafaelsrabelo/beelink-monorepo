"use client"

// App
import { useCart } from "./cart-provider"

/**
 * The cart page's controls for one line, for the tests of a screen that does not draw them: the cart
 * changes under the checkout — the cart's page in another tab — and the price follows it. Named as
 * the cart's own buttons are, so a test reads the same either way.
 */
export function CartStepper({ name, productId }: { name: string; productId: string }) {
  const lines = useCart((cart) => cart.lines)
  const setQty = useCart((cart) => cart.setQty)
  const remove = useCart((cart) => cart.remove)
  const qty = lines.find((line) => line.productId === productId)?.qty ?? 0

  return (
    <div>
      <button type="button" aria-label={`Aumentar a quantidade de ${name}`} onClick={() => setQty(productId, null, qty + 1)} />
      <button type="button" aria-label={`Diminuir a quantidade de ${name}`} onClick={() => setQty(productId, null, Math.max(1, qty - 1))} />
      <button type="button" aria-label={`Remover ${name} do carrinho`} onClick={() => remove(productId, null)} />
    </div>
  )
}
