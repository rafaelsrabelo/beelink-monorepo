/**
 * A shop's Meta Pixel (docs/plans BEELINK-269): the shopkeeper's own pixel, named by its ID and by
 * nothing else. Shops share one domain, so a shopkeeper never gives a script — one shop's script
 * would run on another shop's page. The ID is no secret: any page that loads the pixel shows it.
 */

// Types
import type { IntegrationStatus } from "./integration.js";

/**
 * `GET /stores/:slug/integrations/meta-pixel`: the shop's pixel, as its owner reads it. Also what
 * saving one answers. `status` is `CONNECTED` while an ID is saved and `DISCONNECTED` otherwise —
 * nothing is asked of Meta, so there is no connection of Meta's to go stale.
 */
export interface MetaPixelConnection {
  status: IntegrationStatus;
  /** Digits only, 10 to 20 of them. Null while disconnected. */
  pixelId: string | null;
  /** ISO-8601, when this ID was saved; null while disconnected. */
  connectedAt: string | null;
}

/** `POST /stores/:slug/integrations/meta-pixel`: save the shop's pixel, or replace the one saved. */
export interface MetaPixelConnectPayload {
  /**
   * The pixel's ID as Meta's Events Manager shows it: digits only, 10 to 20 of them. Spaces around
   * it are dropped; anything else — a letter, a dash, a whole snippet — is refused, never cleaned.
   */
  pixelId: string;
}
