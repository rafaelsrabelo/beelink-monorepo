"use client"

// Libs
import { PackageIcon, SearchIcon } from "lucide-react"

// UI
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePagerView, AffiliateProductLinkView } from "@harness-monorepo/ui/lib/affiliate-area"
import { AffiliateAreaPager } from "./affiliate-area-pager"
import { AffiliateCopyLink } from "./affiliate-copy-link"

export interface AffiliateProductLinksProps {
  products: readonly AffiliateProductLinkView[]
  pager: AffiliatePagerView
  search: string
  onSearch: (search: string) => void
  onPage: (page: number) => void
  /** The link just copied, by product. */
  copiedId: string | null
  onCopy: (id: string, url: string) => void
  messages?: UiMessages
}

/** The shop's products with the link that credits the affiliate and what each pays them (IMPULSEIA-108). */
export function AffiliateProductLinks({ products, pager, search, onSearch, onPage, copiedId, onCopy, messages = defaultMessages }: AffiliateProductLinksProps) {
  const text = messages.affiliateArea.products

  return (
    <section aria-labelledby="affiliate-products-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id="affiliate-products-title" className="text-lg font-semibold">
          {text.title}
        </h2>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>

      <div className="relative">
        <SearchIcon aria-hidden="true" className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input type="search" aria-label={text.search} placeholder={text.search} value={search} onChange={(event) => onSearch(event.target.value)} className="pl-9" />
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{search ? text.empty : text.none}</p>
      ) : (
        <ul className="bg-shell-surface border-shell-border divide-border flex flex-col divide-y rounded-xl border">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-3 p-3">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="bg-muted grid size-12 shrink-0 place-items-center rounded-md">
                  <PackageIcon aria-hidden="true" className="text-muted-foreground size-5" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{product.name}</span>
                <span className="text-muted-foreground text-xs">
                  {product.price} · <span className="text-foreground">{product.rate}</span>
                </span>
              </span>
              <AffiliateCopyLink url={product.url} name={product.name} copied={copiedId === product.id} onCopy={(url) => onCopy(product.id, url)} compact messages={messages} />
            </li>
          ))}
        </ul>
      )}

      <AffiliateAreaPager pager={pager} label={text.title} onPage={onPage} messages={messages} />
    </section>
  )
}
