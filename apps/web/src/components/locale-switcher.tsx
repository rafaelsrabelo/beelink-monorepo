"use client"

// Next
import { useRouter } from "next/navigation"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Types
import type { Locale, WebMessages } from "@/locales"

// App
import { LOCALE_COOKIE } from "@/locales"

export interface LocaleSwitcherProps {
  locale: Locale
  messages: WebMessages
}

/**
 * Writes the choice to a readable cookie — the server reads it on the next render, so the language
 * survives a reload without a round trip through the API.
 */
export function LocaleSwitcher({ locale, messages }: LocaleSwitcherProps) {
  const router = useRouter()

  function choose(next: Locale): void {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={messages.locale.label}>
      <Button
        type="button"
        size="sm"
        variant={locale === "pt-BR" ? "secondary" : "ghost"}
        aria-pressed={locale === "pt-BR"}
        onClick={() => choose("pt-BR")}
      >
        {messages.locale.ptBR}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "secondary" : "ghost"}
        aria-pressed={locale === "en"}
        onClick={() => choose("en")}
      >
        {messages.locale.en}
      </Button>
    </div>
  )
}
