"use client"

// Libs
import { useQuery, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { PanelCounts } from "@harness-monorepo/contracts"

// App
import { isSignedOutError } from "@/lib/panel-return"
import { REALTIME_URL } from "@/lib/realtime-config"
import { panelCountsKeys } from "./panel-counts-keys"
import { fetchPanelCounts } from "./panel-counts-requests"

/**
 * How often the counts are read again with nothing telling them to. With the channel it is the slow
 * net under it: a socket that died quietly, and the reviews, which no event announces. Without the
 * channel it is the only clock there is, at the pace the panel's other reads keep.
 */
export const PANEL_COUNTS_EVERY_MS = REALTIME_URL ? 60_000 : 30_000

/**
 * What waits in each area of a shop's panel (BEELINK-309): the one read behind every number in the
 * menu, and the bell's unread messages.
 *
 * It is right in four ways, none depending on another: the real-time channel invalidates it at
 * every event that moves a count (`panelKeysOf`); the panel's own mutations invalidate it without
 * waiting for the channel's echo; it is always stale, so coming back to the tab or to the network
 * reads it again at once; and the clock above reads it when all else is silent — never in a hidden
 * tab, which reads on its return instead.
 *
 * An ended session stops the clock: asking again cannot bring it back, and the page is already on
 * its way to the sign-in (`Providers`). Any other failure keeps the last number on screen — the
 * next read corrects it — rather than blanking a badge over a blip.
 */
export function usePanelCounts(slug: string, enabled = true): UseQueryResult<PanelCounts, Error> {
  return useQuery({
    queryKey: panelCountsKeys.shop(slug),
    queryFn: () => fetchPanelCounts(slug),
    enabled: slug !== "" && enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => (isSignedOutError(query.state.error) ? false : PANEL_COUNTS_EVERY_MS),
  })
}
