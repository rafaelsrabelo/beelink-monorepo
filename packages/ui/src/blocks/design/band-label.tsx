// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * What a band is called everywhere design mode names it: its own name where it has one — a named
 * band is one the owner will look for by that name, in the menu and in the panel — and its place
 * otherwise. The panel, the band's sheet, the preview's handle and the delete dialog all ask here,
 * because the sheet once said "Faixa 2" over a band the panel called "HERO SECTION".
 *
 * A `.tsx` although it draws nothing: the package's export map reaches `./blocks/*` as `.tsx` only.
 */
export function bandLabelOf(name: string | null | undefined, position: number, messages: UiMessages): string {
  return name?.trim() || format(messages.design.bandNumber, { position: String(position) })
}
