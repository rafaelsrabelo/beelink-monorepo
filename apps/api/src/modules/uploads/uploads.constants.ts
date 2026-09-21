/**
 * What the product accepts as an image of a shop, and the one place that decides it.
 *
 * The panel's image field quotes these same numbers to the shopkeeper and refuses before sending,
 * but that check runs in a browser nobody here controls. These are the ones that hold.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** The error codes this module answers, all of which the web already has a sentence for. */
export type UploadErrorCode =
  | 'UPLOAD_NOT_CONFIGURED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_GATEWAY'
  | 'BAD_REQUEST';
