// Locales
import { en } from "./en"
import type { Locale, UiMessages } from "./messages"
import { ptBR } from "./pt-BR"

export type { Locale, UiMessages } from "./messages"
export { en } from "./en"
export { ptBR } from "./pt-BR"

export const uiMessages: Record<Locale, UiMessages> = { "pt-BR": ptBR, en }

/** The product's own language. A block falls back to it when a screen passes none. */
export const defaultLocale: Locale = "pt-BR"
export const defaultMessages: UiMessages = ptBR

/**
 * Fills `{name}`-style placeholders. It is what keeps a parameterised sentence out of a function:
 * a dictionary is handed to a Client Component as a prop, and React serialises that prop, so a
 * function anywhere in it fails the whole tree — on every page, not only the one that reads it.
 */
export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
