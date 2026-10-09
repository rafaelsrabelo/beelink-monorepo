// Next
import type { Metadata } from "next"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

/**
 * The icons a shop's pages declare (BEELINK-312): the shop's own; with none, its logo; with neither,
 * nothing at all — and a page that declares nothing is left with bee-link's (`app/icon.png`,
 * `app/apple-icon.png`), which Next adds only where no segment set `icons`.
 *
 * Both rels point at the one picture: a phone's home screen is the shop's as much as a tab is. And no
 * `type` or `sizes` is said of it — the address is all that is stored, and a browser reads the rest
 * from the file.
 *
 * `favicon.ico` lives in `public/` and not in `app/` for this function's sake: from `app/`, Next
 * puts it first in the head of every page whatever `icons` says, and a shop's tab would be handed
 * bee-link's icon beside its own.
 */
export function shopIconsOf(store: Pick<PublicStore, "faviconUrl" | "logoUrl"> | null): Pick<Metadata, "icons"> {
  const url = store?.faviconUrl ?? store?.logoUrl

  return url ? { icons: { icon: [{ url }], apple: [{ url }] } } : {}
}
