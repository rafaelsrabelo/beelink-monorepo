// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { toCloudinaryConfig, reasonOf } from './cloudinary.service.js';
import type { CloudinaryConfig } from './cloudinary.service.js';
import { signCloudinary } from './cloudinary-signature.js';

/** What a private upload comes to: the id it is kept under and its format, or why there is none. */
export type PrivateUpload =
  | { status: 'uploaded'; publicId: string; format: string }
  | { status: 'not-configured' }
  | { status: 'unsupported' }
  | { status: 'too-large' }
  | { status: 'unavailable' };

/** Cloudinary's delivery type for a file nobody reaches without a signature. */
const AUTHENTICATED = 'authenticated';
const TIMEOUT_MS = 15_000;

const seconds = (at: Date): string => Math.floor(at.getTime() / 1000).toString();

/**
 * The files nobody may reach by their address (the user's review, 12/11/2026): the photos of an
 * affiliate's identity document. Uploaded as Cloudinary `authenticated` assets, so their own URL
 * answers 401; kept by `public_id`, never by an address; read through a download link this API signs
 * and that stops working at the instant it names. No SDK, as `CloudinaryService` explains.
 */
@Injectable()
export class CloudinaryPrivateAssets {
  private readonly logger = new Logger(CloudinaryPrivateAssets.name);

  config(): CloudinaryConfig | null {
    return toCloudinaryConfig(env);
  }

  /**
   * One file into `<folder>/<subfolder>`. What it may be and how large is the caller's: a document's
   * photo is not a logo, and may be a PDF — which Cloudinary keeps as an image resource too.
   */
  async upload(file: { bytes: Buffer; type: string; filename: string }, subfolder: string, accept: { types: readonly string[]; maxBytes: number }): Promise<PrivateUpload> {
    const config = this.config();
    if (!config) return { status: 'not-configured' };
    if (!accept.types.includes(file.type)) return { status: 'unsupported' };
    if (file.bytes.byteLength > accept.maxBytes) return { status: 'too-large' };

    const signed = { folder: `${config.folder}/${subfolder}`, timestamp: seconds(new Date()), type: AUTHENTICATED };
    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.filename);
    for (const [name, value] of Object.entries(signed)) body.append(name, value);
    body.append('api_key', config.apiKey);
    body.append('signature', await signCloudinary(signed, config.apiSecret));

    try {
      const response = await fetch(`${env.CLOUDINARY_API_URL}/v1_1/${config.cloudName}/image/upload`, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) {
        this.logger.error({ status: response.status, cloudName: config.cloudName, cloudinary: await reasonOf(response) }, 'Cloudinary refused a private upload');
        return { status: 'unavailable' };
      }
      const stored = storedOf(await response.json());
      if (!stored) this.logger.error({ cloudName: config.cloudName }, 'Cloudinary answered a private upload with no public_id');
      return stored ? { status: 'uploaded', ...stored } : { status: 'unavailable' };
    } catch (error) {
      this.logger.error({ err: error, cloudName: config.cloudName }, 'Cloudinary did not answer a private upload');
      return { status: 'unavailable' };
    }
  }

  /** A link to the file that works until `expiresAt`, and only for this file in this format. Null when nothing is configured. */
  async downloadUrl(publicId: string, format: string, expiresAt: Date, now = new Date()): Promise<string | null> {
    const config = this.config();
    return config ? privateDownloadUrl(config, { publicId, format, expiresAt, now }) : null;
  }

  /** Deleted for good, best effort: false, logged, when Cloudinary did not say it was. */
  async destroy(publicId: string): Promise<boolean> {
    const config = this.config();
    if (!config) return false;
    const signed = { public_id: publicId, timestamp: seconds(new Date()), type: AUTHENTICATED };
    const body = new URLSearchParams({ ...signed, api_key: config.apiKey, signature: await signCloudinary(signed, config.apiSecret) });
    try {
      const response = await fetch(`${env.CLOUDINARY_API_URL}/v1_1/${config.cloudName}/image/destroy`, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const answer: unknown = response.ok ? await response.json() : null;
      // "not found" is the outcome wanted: the file is not there.
      const gone = typeof answer === 'object' && answer !== null && 'result' in answer && (answer.result === 'ok' || answer.result === 'not found');
      if (!gone) this.logger.error({ status: response.status, cloudName: config.cloudName }, 'Cloudinary did not delete a private file');
      return gone;
    } catch (error) {
      this.logger.error({ err: error, cloudName: config.cloudName }, 'Cloudinary did not answer a private delete');
      return false;
    }
  }
}

/**
 * Cloudinary's private download link (`private_download_url` in its SDKs): the API's own download
 * route, with the file's id, its format, its delivery type and an expiry, signed. The address is the
 * API's and not the CDN's, which is why an expiry can be enforced at all.
 */
export async function privateDownloadUrl(config: CloudinaryConfig, input: { publicId: string; format: string; expiresAt: Date; now: Date }): Promise<string> {
  const signed = { expires_at: seconds(input.expiresAt), format: input.format, public_id: input.publicId, timestamp: seconds(input.now), type: AUTHENTICATED };
  const query = new URLSearchParams({ ...signed, api_key: config.apiKey, signature: await signCloudinary(signed, config.apiSecret) });
  return `${env.CLOUDINARY_API_URL}/v1_1/${config.cloudName}/image/download?${query.toString()}`;
}

function storedOf(payload: unknown): { publicId: string; format: string } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { public_id: publicId, format } = payload as { public_id?: unknown; format?: unknown };
  return typeof publicId === 'string' && publicId && typeof format === 'string' && format ? { publicId, format } : null;
}
