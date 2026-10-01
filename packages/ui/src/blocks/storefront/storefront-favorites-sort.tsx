// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontFavoritesSortProps {
  /** Where the form goes: the favourites tab, its order in the address. */
  action: string
  /** The order's key, as the screen spells it in the address. */
  name: string
  value: string
  /** Curtidos recentemente · Menor preço · Maior desconto, as the screen names them in the address. */
  orders: readonly { value: string; label: string }[]
  /** Carried along, so ordering keeps the filter chosen. */
  hidden?: Readonly<Record<string, string>>
  messages?: UiMessages
}

const FIELD = "h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-sm font-semibold text-shop-on-background"

/** 6g's "Ordenar" beside the title. A GET form, as Meus pedidos' toolbar is: no script, and the address says what it shows. */
export function StorefrontFavoritesSort({ action, name, value, orders, hidden = {}, messages = defaultMessages }: StorefrontFavoritesSortProps) {
  const text = messages.storefront

  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {Object.entries(hidden).map(([field, hiddenValue]) => (
        <input key={field} type="hidden" name={field} value={hiddenValue} />
      ))}
      <label className="flex items-center gap-2 text-sm text-shop-muted">
        {text.favoritesSortLabel}
        <select name={name} defaultValue={value} className={FIELD}>
          {orders.map((order) => (
            <option key={order.value} value={order.value}>
              {order.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="h-11 cursor-pointer rounded-[10px] bg-shop-primary px-4 text-sm font-semibold text-shop-on-primary">
        {text.favoritesSortApply}
      </button>
    </form>
  )
}
