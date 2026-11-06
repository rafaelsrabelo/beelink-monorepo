// Types
import type { ProductImportType } from './product-import.constants.js';

function startsWith(bytes: Buffer, signature: readonly number[], offset = 0): boolean {
  return bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * What the file is, by its first bytes and never by the name or type the browser sent. A PDF saved
 * from WhatsApp arrives as `application/octet-stream` on more than one phone, and a declared type is
 * whatever the sender wrote; the model is told the type this answers, so it has to be the true one.
 */
export function importTypeOf(bytes: Buffer): ProductImportType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  // RIFF, four bytes of length, WEBP.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';

  return null;
}
