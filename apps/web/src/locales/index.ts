// Locales (design system)
import { uiMessages } from "@harness-monorepo/ui/locales/index"
import type { Locale, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Locales (screens)
import { en } from "./en"
import type { WebMessages } from "./messages"
import { ptBR } from "./pt-BR"

export type { WebMessages } from "./messages"
export type { Locale } from "@harness-monorepo/ui/locales/messages"

export const LOCALES: Locale[] = ["pt-BR", "en"]
export const DEFAULT_LOCALE: Locale = "pt-BR"

/** The cookie a person's choice lands in; the proxy and the server layout both read it. */
export const LOCALE_COOKIE = "locale"

const webMessages: Record<Locale, WebMessages> = { "pt-BR": ptBR, en }

export function isLocale(value: string | undefined): value is Locale {
  return value === "pt-BR" || value === "en"
}

export function messagesFor(locale: Locale): { web: WebMessages; ui: UiMessages } {
  return { web: webMessages[locale], ui: uiMessages[locale] }
}

/** Fills `{name}`-style placeholders. Keeps dictionaries plain data, which crosses to the client. */
export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
