// Libs
import { create } from "zustand"

export interface ConversationPanelState {
  open: boolean
  /** The order whose conversation shows; null shows the list. */
  order: number | null
  /** Panels on the page: none, and "Falar com a loja" follows its address instead. */
  panels: number
  show: (order: number | null) => void
  back: () => void
  close: () => void
  mount: () => () => void
}

/**
 * The conversations' panel of the page: the header draws it, "Falar com a loja" on an order and the
 * header's balloon open it — components that are not parent and child.
 *
 * A module store and not one per shop like the cart: it holds no shopper's data, only whether a
 * panel is open, and nothing sets it on the server, where every request reads it closed.
 */
export const useConversationPanel = create<ConversationPanelState>()((set) => ({
  open: false,
  order: null,
  panels: 0,
  show: (order) => set({ open: true, order }),
  back: () => set({ order: null }),
  // The order stays until the next open says which, so the sheet slides out with what it showed.
  close: () => set({ open: false }),
  mount: () => {
    set((state) => ({ panels: state.panels + 1 }))
    return () => set((state) => ({ panels: state.panels - 1 }))
  },
}))
