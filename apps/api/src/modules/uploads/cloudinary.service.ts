// Nest
import { Injectable } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from './uploads.constants.js';

/** What the adapter needs to sign and address an upload. All three, or uploads are not configured. */
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

/**
 * Four outcomes, not two. A file that is too big and a service that is down are different
 * sentences and different things for the shopkeeper to do, and collapsing them is what made the
 * legacy answer "Erro ao fazer upload" to a 4 MB photo.
 */
export type ImageUpload =
  | { status: 'uploaded'; url: string }
  | { status: 'unsupported' }
  | { status: 'too-large' }
  | { status: 'unavailable' };

/** A slow upload may not hold a connection forever; the shopkeeper can always try again. */
const TIMEOUT_MS = 15_000;

/**
 * All three or none. Two of three is a deployment that looks switched on and fails at the first
 * file, so a half-configured environment reads as no configuration at all.
 */
export function toCloudinaryConfig(source: {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER: string;
}): CloudinaryConfig | null {
  if (!source.CLOUDINARY_CLOUD_NAME || !source.CLOUDINARY_API_KEY || !source.CLOUDINARY_API_SECRET) {
    return null;
  }

  return {
    cloudName: source.CLOUDINARY_CLOUD_NAME,
    apiKey: source.CLOUDINARY_API_KEY,
    apiSecret: source.CLOUDINARY_API_SECRET,
    folder: source.CLOUDINARY_FOLDER,
  };
}

/**
 * The storage adapter. It lives behind the API and not behind the web app's BFF because an
 * uploaded image is product state: it becomes `Store.logoUrl`, it costs money, and who is allowed
 * to create one is decided where every other ownership question is decided.
 *
 * Signed, and never an unsigned preset: an unsigned preset is a public write credential, and
 * anyone who found it could fill the account with their own files. The signature is computed here
 * and the secret never leaves this process.
 *
 * No Cloudinary SDK. A signed upload is one multipart POST and one digest, and the legacy's use of
 * the SDK is not what made it work — what it did was put the cloud name, the key and the secret
 * into `src/app/api/upload-image/route.ts` as `||` fallbacks, in a public repository.
 */
@Injectable()
export class CloudinaryService {
  /** The configuration this deployment runs with, or `null` when uploads are switched off. */
  config(): CloudinaryConfig | null {
    return toCloudinaryConfig(env);
  }

  async upload(file: { bytes: Buffer; type: string; filename: string }, config: CloudinaryConfig): Promise<ImageUpload> {
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      return { status: 'unsupported' };
    }

    if (file.bytes.byteLength > MAX_UPLOAD_BYTES) return { status: 'too-large' };

    // Only what is signed goes in here. `file` and `api_key` are sent but never signed — that is
    // Cloudinary's rule, and including them produces a signature the service rejects.
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await sign({ folder: config.folder, timestamp }, config.apiSecret);

    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.filename);
    body.append('api_key', config.apiKey);
    body.append('folder', config.folder);
    body.append('timestamp', timestamp);
    body.append('signature', signature);

    let payload: unknown;

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // Every refusal from Cloudinary is "unavailable" to this product: a rejected signature, a
      // suspended account and a full quota are all operator problems, and none of them is something
      // the shopkeeper can fix by choosing a different picture.
      if (!response.ok) return { status: 'unavailable' };

      payload = await response.json();
    } catch {
      return { status: 'unavailable' };
    }

    const url = secureUrlOf(payload);

    // A 200 with no usable address is not a success. Answering `uploaded` with an empty string
    // would write `""` into `logoUrl` and lose the shop's picture with no error anywhere.
    return url ? { status: 'uploaded', url } : { status: 'unavailable' };
  }
}

/**
 * Cloudinary's own signing scheme: the signed parameters, sorted by name, joined as a query
 * string, with the API secret appended, digested with SHA-1. The algorithm is theirs and not a
 * choice made here — it authenticates a request with a shared secret, and the service echoes the
 * string it signed back on a refusal, which is what this was checked against.
 */
async function sign(params: Record<string, string>, apiSecret: string): Promise<string> {
  const payload = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');

  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(payload + apiSecret));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** `secure_url` and never `url`: the plain one is http, and the panel is served over https. */
function secureUrlOf(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null || !('secure_url' in payload)) return '';
  const url = (payload as { secure_url: unknown }).secure_url;
  return typeof url === 'string' ? url : '';
}
