// Types
import type { CatalogErrorCode, ProductImportErrorCode } from '@harness-monorepo/contracts';

/**
 * What the read accepts. Ten megabytes is a menu of a few dozen pages with photos in it, and the
 * model's own ceiling (32 MB a request, once base64 has added its third) is well above it.
 */
export const PRODUCT_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

/** A PDF, or a photo of the menu: the reader sees an image the way it sees a page. */
export const PRODUCT_IMPORT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const;
export type ProductImportType = (typeof PRODUCT_IMPORT_TYPES)[number];

/** Products in one import: one read's worth, and one transaction that ends within its time limit. */
export const PRODUCT_IMPORT_MAX = 100;

/** The import's transaction. A hundred products with options is some hundreds of writes. */
export const PRODUCT_IMPORT_TRANSACTION_MS = 60_000;

/** The codes the import's routes answer of their own, beside the catalogue's and the HTTP fallbacks. */
export type ProductImportRouteErrorCode =
  | ProductImportErrorCode
  | CatalogErrorCode
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_REQUEST';

export function productImportError(
  errorCode: ProductImportRouteErrorCode,
  message: string,
): { errorCode: ProductImportRouteErrorCode; message: string } {
  return { errorCode, message };
}
