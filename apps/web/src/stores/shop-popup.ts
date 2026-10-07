// Libs
import { create } from "zustand"

export interface ShopPopupState {
  /** The shops whose pop-up is on the screen now, by slug. */
  open: Readonly<Record<string, true>>
  /** The shops whose pop-up was already opened in this page's life: it opens once per load, whatever happens after. */
  shown: Readonly<Record<string, true>>
  show: (slug: string) => void
  hide: (slug: string) => void
}

/**
 * Whether a shop's first-purchase pop-up is open, and whether it already opened in this page's life
 * (BEELINK-306). In memory: what outlives the page is the visitor's `bl_popup` cookie, written
 * where the pop-up is closed.
 *
 * A module store, keyed by shop, so "already opened" outlives the component: a page that draws the
 * pop-up again within one load does not open it twice. It holds nothing of a visitor, and nothing
 * sets it on the server, where every request reads it closed.
 */
export const useShopPopup = create<ShopPopupState>()((set) => ({
  open: {},
  shown: {},
  show: (slug) => set((state) => ({ open: { ...state.open, [slug]: true }, shown: { ...state.shown, [slug]: true } })),
  hide: (slug) =>
    set((state) => {
      const { [slug]: _closed, ...open } = state.open
      return { open }
    }),
}))
