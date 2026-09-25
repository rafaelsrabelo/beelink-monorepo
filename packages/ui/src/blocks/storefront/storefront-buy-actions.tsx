// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontBuyActionsProps {
  /** The product's name, for what a reader hears once it is added. */
  name: string
  qty: number
  onQtyChange: (qty: number) => void
  /** Whether this visit already put it in the cart, here or from the phone's bar. */
  added: boolean
  /** Puts `qty` in the cart; the web knows the chosen combination. */
  onAdd: () => void
  /** The cart's address: "Comprar agora" adds, then goes there, and "Ver carrinho" follows an add. */
  cartHref: string
  maxQty?: number
  messages?: UiMessages
}

/**
 * 5b's two pills: 48px, 15px bold, the whole width of the box. The transparent border is invisible
 * until forced colours paint it, and then it is what keeps the pill's shape.
 */
export const BUY_PILL = "flex h-12 w-full items-center justify-center rounded-full border border-transparent px-5 text-[15px] font-bold transition-opacity hover:opacity-90"

/**
 * The buy box's way to buy: "Quantidade" in the phone's own picker, "Adicionar ao carrinho", and
 * "Comprar agora" — which adds and goes to the cart.
 */
export function StorefrontBuyActions({ name, qty, onQtyChange, added, onAdd, cartHref, maxQty = 10, messages = defaultMessages }: StorefrontBuyActionsProps) {
  const text = messages.storefront

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex items-center gap-2.5 text-[14px]">
        {text.cartQuantity}
        {/* Native, so a phone opens its own picker. 16px below shop-sm: iOS zooms into a smaller field. */}
        <select
          value={qty}
          onChange={(event) => onQtyChange(Number(event.target.value))}
          className="h-[38px] rounded-[10px] border border-shop-line-strong bg-shop-fill px-3 text-base font-bold text-shop-on-background shop-sm:text-[14px]"
        >
          {Array.from({ length: Math.max(maxQty, qty) }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={onAdd} className={`${BUY_PILL} bg-shop-primary text-shop-on-primary`}>
        {text.addToCart}
      </button>

      {/* A link, so the cart is an address; the add happens on the way, before the page leaves —
          once: after "Adicionar ao carrinho" the line is already there. */}
      <a
        href={cartHref}
        onClick={() => {
          if (!added) onAdd()
        }}
        className={`${BUY_PILL} bg-shop-text text-shop-on-text`}
      >
        {text.buyNow}
      </a>

      <p role="status" className="text-center text-[13px] empty:hidden">
        {added ? (
          <>
            {format(text.addedToCartStatus, { name })}{" "}
            <a href={cartHref} className="font-semibold text-shop-primary-ink underline">
              {text.viewCart}
            </a>
          </>
        ) : null}
      </p>
    </div>
  )
}
