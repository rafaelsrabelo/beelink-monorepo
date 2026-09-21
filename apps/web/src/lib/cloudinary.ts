/**
 * The storage adapter, server-side. It is here and not in a component for the same reason the
 * postcode lookup is: the browser must never hold the API secret, and a signed upload straight
 * from the page would put it in the bundle.
 *
 * Signed and not unsigned/preset: an unsigned preset is a public write credential — anyone who
 * reads the bundle can fill the account with their own files. The signature is computed here, per
 * request, and never leaves the server.
 *
 * The legacy did this in `src/app/api/upload-image/route.ts` with the SDK and the credentials
 * written into the file as `||` fallbacks. There is no SDK here — a signed upload is one multipart
 * POST and one digest — and no literal: the credentials come through the env schema or uploads are
 * honestly switched off.
 */

// App
import { serverEnv } from "@/lib/server-env"

/** What the adapter needs to sign and address an upload. All four, or uploads are not configured. */
export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
  folder: string
}

/**
 * Five outcomes, not two. A file that is too big and a service that is down are different
 * sentences and different things for the shopkeeper to do, and collapsing them is what made the
 * legacy answer "Erro ao fazer upload" to a 4 MB photo.
 */
export type ImageUpload =
  | { status: "uploaded"; url: string }
  | { status: "unsupported" }
  | { status: "too-large" }
  | { status: "unavailable" }

/**
 * The ceiling and the formats the server enforces. The image field quotes the same numbers to the
 * shopkeeper and refuses before sending, but that check is a courtesy — it runs in a browser the
 * server does not control. These are the ones that decide.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const

/** A slow upload may not hold the panel open forever; the shopkeeper can always try again. */
const TIMEOUT_MS = 15_000

/**
 * All four or none. Two of three is a deployment that looks switched on and fails at the first
 * file, which is worse than an honest refusal — so a half-configured environment reads as no
 * configuration at all.
 */
export function toCloudinaryConfig(env: {
  CLOUDINARY_CLOUD_NAME?: string
  CLOUDINARY_API_KEY?: string
  CLOUDINARY_API_SECRET?: string
  CLOUDINARY_FOLDER: string
}): CloudinaryConfig | null {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return null

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_FOLDER,
  }
}

/** The configuration this deployment runs with, or `null` when uploads are switched off. */
export function cloudinaryConfig(): CloudinaryConfig | null {
  return toCloudinaryConfig(serverEnv)
}

/**
 * Cloudinary's own signing scheme: the signed parameters, sorted by name, joined as a query
 * string, with the API secret appended, digested with SHA-1. The algorithm is theirs and not a
 * choice made here — it is what an account verifies against by default, and it authenticates a
 * request with a shared secret rather than standing in for a collision-resistant hash.
 */
async function sign(params: Record<string, string>, apiSecret: string): Promise<string> {
  const payload = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&")

  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(payload + apiSecret))

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function uploadImage(file: File, config: CloudinaryConfig): Promise<ImageUpload> {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return { status: "unsupported" }
  }

  if (file.size > MAX_UPLOAD_BYTES) return { status: "too-large" }

  // Only what is signed goes in here. `file` and `api_key` are sent but never signed — that is
  // Cloudinary's rule, and including them produces a signature the service rejects.
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = await sign({ folder: config.folder, timestamp }, config.apiSecret)

  const body = new FormData()
  body.append("file", file)
  body.append("api_key", config.apiKey)
  body.append("folder", config.folder)
  body.append("timestamp", timestamp)
  body.append("signature", signature)

  let payload: unknown

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" },
    )

    // Every refusal from Cloudinary is "unavailable" to this app: a rejected signature, a suspended
    // account and a full quota are all operator problems, and none of them is something the
    // shopkeeper can fix by choosing a different picture.
    if (!response.ok) return { status: "unavailable" }

    payload = await response.json()
  } catch {
    return { status: "unavailable" }
  }

  const url = secureUrlOf(payload)

  // A 200 with no usable address is not a success. Answering `uploaded` with an empty string would
  // write `""` into `logoUrl` and lose the shop's picture with no error anywhere.
  return url ? { status: "uploaded", url } : { status: "unavailable" }
}

/** `secure_url` and never `url`: the plain one is http, and the panel is served over https. */
function secureUrlOf(payload: unknown): string {
  if (typeof payload !== "object" || payload === null || !("secure_url" in payload)) return ""
  const url = (payload as { secure_url: unknown }).secure_url
  return typeof url === "string" ? url : ""
}
