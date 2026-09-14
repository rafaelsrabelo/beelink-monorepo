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
