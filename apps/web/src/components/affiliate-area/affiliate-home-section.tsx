"use client"

// Types
import type { AffiliateHome } from "@harness-monorepo/contracts"

// UI
import { AffiliateHomePanel } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-home-panel"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { homeViewOf, type AreaWords } from "@/lib/affiliate-area-view"
import { useCopied } from "./use-copied"

export interface AffiliateHomeSectionProps {
  home: AffiliateHome
  words: AreaWords
  messages: UiMessages
}

/** The front page at a shop: what is owed, the next payment, the link, the last thirty days. */
export function AffiliateHomeSection({ home, words, messages }: AffiliateHomeSectionProps) {
  const { copiedKey, copy } = useCopied()
  return <AffiliateHomePanel home={homeViewOf(home, words, messages.affiliateArea.home)} copied={copiedKey === "link"} onCopy={(url) => copy("link", url)} messages={messages} />
}
