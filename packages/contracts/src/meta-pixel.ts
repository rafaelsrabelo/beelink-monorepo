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
  /** The purchases told to Meta from the server (BEELINK-274), and the token they are told with. */
  conversions: MetaPixelConversions;
}

/**
 * Where the shop's Conversions API access token stands. The token itself never travels back: it is
 * sealed when it is saved, and this says only whether one is there. `REJECTED` is Meta refusing it,
 * or the pixel under it — nothing more is sent from the server until another token is saved, while
 * the pixel in the browser goes on as before.
 */
export type MetaConversionsTokenState = "NONE" | "SET" | "REJECTED";

/**
 * What Meta refused. `TOKEN_REJECTED`: the token is invalid, expired or revoked. `PIXEL_NOT_FOUND`:
 * Meta knows no pixel by the saved ID that this token may send to — a wrong ID, or a token of
 * another pixel or business.
 */
export type MetaConversionsRefusal = "TOKEN_REJECTED" | "PIXEL_NOT_FOUND";

export interface MetaPixelConversions {
  /** Whether this deployment can keep a token at all: false with no `INTEGRATIONS_SECRET_KEY`, and then none is saved. */
  available: boolean;
  token: MetaConversionsTokenState;
  /** Set while `token` is `REJECTED`, null otherwise. */
  refusal: MetaConversionsRefusal | null;
  /** ISO-8601, when Meta refused; null unless `REJECTED`. */
  refusedAt: string | null;
}

/** `POST /stores/:slug/integrations/meta-pixel`: save the shop's pixel, or replace the one saved. */
export interface MetaPixelConnectPayload {
  /**
   * The pixel's ID as Meta's Events Manager shows it: digits only, 10 to 20 of them. Spaces around
   * it are dropped; anything else — a letter, a dash, a whole snippet — is refused, never cleaned.
   */
  pixelId: string;
}

/**
 * `POST /stores/:slug/integrations/meta-pixel/token`: save the shop's Conversions API access token,
 * or replace the one saved. It answers the connection. Meta is asked nothing: the test event is how
 * a token is tried. `DELETE` on the same path removes it. Saving another pixel ID removes it too —
 * a token is one pixel's.
 */
export interface MetaPixelTokenPayload {
  /** As Meta's Events Manager generates it: 20 to 1,000 visible characters, no spaces. Spaces around it are dropped. */
  accessToken: string;
}

/** `POST /stores/:slug/integrations/meta-pixel/test-event`: send one test event to the shop's pixel with its token. */
export interface MetaPixelTestEventPayload {
  /** The code Events Manager shows under "Test events" — letters, digits, `_` and `-`, 3 to 40. */
  testEventCode: string;
}

/**
 * What came of a test event, in bee-link's words. `EVENT_REFUSED`: Meta took the token and the pixel
 * and refused the event itself — a test code it does not know, most likely. `UNREACHABLE`: no
 * answer, or Meta's own failure; nothing was decided.
 */
export type MetaPixelTestEventOutcome = "ACCEPTED" | "TOKEN_REJECTED" | "PIXEL_NOT_FOUND" | "EVENT_REFUSED" | "UNREACHABLE";

export interface MetaPixelTestEventResult {
  outcome: MetaPixelTestEventOutcome;
  /** Meta's own words for a refusal, for the shopkeeper to read or pass on; null when it gave none. Never the token. */
  detail: string | null;
}
