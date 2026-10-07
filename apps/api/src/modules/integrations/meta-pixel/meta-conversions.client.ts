/**
 * One event as Meta's Conversions API takes it — the fields bee-link sends and no other.
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
 */
export interface MetaServerEvent {
  event_name: string;
  /** Unix seconds. More than seven days back and Meta refuses the whole request. */
  event_time: number;
  /** The same id the browser's pixel tells the event by: with the name, what Meta counts the two once by. */
  event_id: string;
  action_source: 'website';
  event_source_url: string;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
}

/** Who did it, as far as Meta is told. `em`, `ph` and `external_id` are SHA-256, in hex; the rest goes as it is. */
export interface MetaUserData {
  em?: string[];
  ph?: string[];
  external_id?: string[];
  fbc?: string;
  fbp?: string;
  client_user_agent?: string;
}

/** A purchase's own data, in the words the browser's pixel uses for the same purchase. */
export interface MetaCustomData {
  value: number;
  currency: 'BRL';
  content_ids: string[];
  content_type: 'product';
  contents: { id: string; quantity: number; item_price: number }[];
  num_items: number;
}

/** Meta answered that the token is no good: invalid, expired or revoked. No other event of the shop is worth sending with it. */
export class MetaTokenRejected extends Error {}

/** Meta knows no pixel by that ID this token may send to: a wrong ID, or a token of another pixel. */
export class MetaPixelNotFound extends Error {}

/** Meta took the token and the pixel and refused the event itself: sending it again changes nothing. */
export class MetaEventRefused extends Error {}

/** Meta did not answer, answered with its own failure, or asked for time: nothing was decided, and later the same send may pass. */
export class MetaUnreachable extends Error {}

/**
 * What bee-link asks of Meta's Conversions API with a shop's token (BEELINK-274). A port: the module
 * binds it to `MetaConversionsHttpClient`, and a test stands a fake Meta in its place. One event a
 * call, on purpose: Meta refuses a whole request for one event it will not take. An implementation
 * never keeps, logs or repeats the token, and its errors carry Meta's words only.
 */
export abstract class MetaConversionsClient {
  /** Resolves once Meta took the event; anything else is one of the four errors above. */
  abstract send(pixelId: string, accessToken: string, event: MetaServerEvent, testEventCode?: string): Promise<void>;
}
