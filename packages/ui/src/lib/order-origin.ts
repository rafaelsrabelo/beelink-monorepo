// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Mirrors the wire's `OrderOrigin`; this package imports no contracts. */
export interface OrderOriginView {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  /** The visit came by a click on a Meta ad — said in words, never by its identifier, which is not here. */
  metaAd: boolean
}

export interface OrderOriginLines {
  /** "Anúncio da Meta · facebook / cpc · campanha teste", or "Direto / sem campanha". */
  line: string
  /** "Conteúdo: vídeo 1 · Termo: whey"; null with neither. */
  detail: string | null
}

type OriginText = UiMessages["orders"]["detail"]["origin"]

/**
 * Where an order's buyer came from, in one line for its page (BEELINK-275): whether an ad of Meta's
 * brought them, the source and the medium, and the campaign. No origin at all is a direct visit.
 *
 * The labels were written by whoever made the link, and are handed back as plain strings: they are
 * drawn as text, and nothing here builds markup from them.
 */
export function originLinesOf(origin: OrderOriginView | null, text: OriginText): OrderOriginLines {
  if (!origin) return { line: text.direct, detail: null }

  const channel = [origin.source, origin.medium].filter((part) => part !== null).join(" / ")
  const parts = [origin.metaAd ? text.metaAd : null, channel || null, origin.campaign !== null ? format(text.campaign, { name: origin.campaign }) : null].filter((part) => part !== null)
  const details = [origin.content !== null ? format(text.content, { value: origin.content }) : null, origin.term !== null ? format(text.term, { value: origin.term }) : null].filter((part) => part !== null)

  return { line: parts.length > 0 ? parts.join(" · ") : text.direct, detail: details.length > 0 ? details.join(" · ") : null }
}
