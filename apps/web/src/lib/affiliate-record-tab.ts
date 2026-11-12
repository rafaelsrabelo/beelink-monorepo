// UI
import { AFFILIATE_RECORD_TABS, type AffiliateRecordTab } from "@harness-monorepo/ui/lib/affiliates"

/** The query key the record's tab travels in, a Portuguese word like the affiliate's own area's. */
export const RECORD_TAB_KEY = "aba"

/** The tab an address names; none, or a word it does not know, is Geral. */
export function recordTabOf(param: string | null): AffiliateRecordTab {
  return AFFILIATE_RECORD_TABS.find((tab) => tab === param) ?? "geral"
}

/** A tab's address: Geral is the record's own, with nothing after it. */
export function recordTabHrefOf(recordHref: string, tab: AffiliateRecordTab): string {
  return tab === "geral" ? recordHref : `${recordHref}?${RECORD_TAB_KEY}=${tab}`
}
