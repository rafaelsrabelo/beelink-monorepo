// Libs
import { create } from "zustand"

export interface GestorState {
  /** The tap the bell needs was given — in this tab, since a reload asks the browser again. */
  started: boolean
  soundOn: boolean
  start: () => void
  setSound: (on: boolean) => void
}

/**
 * The manager's switches (plan 2026-11-10--modo-gestor): whether the counter was opened, and the
 * bell. In memory on purpose — a browser forgets the tap with the page, so remembering "started"
 * past it would only draw a counter whose bell cannot ring.
 */
export const useGestor = create<GestorState>()((set) => ({
  started: false,
  soundOn: true,
  start: () => set({ started: true }),
  setSound: (on) => set({ soundOn: on }),
}))
