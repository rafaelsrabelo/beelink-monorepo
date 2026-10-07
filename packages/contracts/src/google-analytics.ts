/**
 * A shop's Google Analytics (docs/plans BEELINK-301): the shopkeeper's own GA4 property, named by
 * its measurement ID and by nothing else. Shops share one domain, so a shopkeeper never gives a
 * script or a Tag Manager container — one shop's script would run on another shop's page. The ID is
 * no secret: any page that loads Google's tag shows it.
 */

// Types
import type { IntegrationStatus } from "./integration.js";

/**
 * `GET /stores/:slug/integrations/google-analytics`: the shop's property, as its owner reads it.
 * Also what saving one answers. `status` is `CONNECTED` while an ID is saved and `DISCONNECTED`
 * otherwise — nothing is asked of Google, so there is no connection of Google's to go stale.
 */
export interface GoogleAnalyticsConnection {
  status: IntegrationStatus;
  /** `G-` and 6 to 16 capital letters or digits. Null while disconnected. */
  measurementId: string | null;
  /** ISO-8601, when this ID was saved; null while disconnected. */
  connectedAt: string | null;
}

/** `POST /stores/:slug/integrations/google-analytics`: save the shop's measurement ID, or replace the one saved. */
export interface GoogleAnalyticsConnectPayload {
  /**
   * The GA4 measurement ID as Google Analytics shows it under the web data stream: `G-` and 6 to 16
   * capital letters or digits. Spaces around it are dropped; anything else — a Universal Analytics
   * `UA-`, a Tag Manager `GTM-`, a Google Ads `AW-`, a whole snippet — is refused, never cleaned.
   */
  measurementId: string;
}
