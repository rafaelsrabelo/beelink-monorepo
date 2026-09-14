// Next
import { cookies, headers } from "next/headers"

// Locales
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, messagesFor } from "@/locales"
import type { Locale } from "@/locales"

/** The header a browser sends, as an ordered list of tags — quality values and all. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  const tags = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, quality] = part.trim().split(";q=")
      return { tag: (tag ?? "").toLowerCase(), quality: Number(quality ?? 1) }
    })
    .filter((entry) => entry.tag !== "")
    .sort((a, b) => b.quality - a.quality)

  for (const { tag } of tags) {
    if (tag.startsWith("pt")) return "pt-BR"
    if (tag.startsWith("en")) return "en"
  }

  return DEFAULT_LOCALE
}

/** A person's choice wins over their browser's; the choice lives in a cookie the switcher writes. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(chosen)) return chosen

  return localeFromAcceptLanguage((await headers()).get("accept-language"))
}

export async function getMessages(): Promise<ReturnType<typeof messagesFor> & { locale: Locale }> {
  const locale = await getLocale()
  return { locale, ...messagesFor(locale) }
}
