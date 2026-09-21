/**
 * What a failed upload carries: the handler's stable code, never a sentence. `UPLOAD_NOT_CONFIGURED`
 * is the one the 501 seam answers today, and it reads as a real explanation in `src/locales/`.
 */
export class UploadError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "UploadError"
  }
}

/** What `/api/uploads` answers on success, whichever storage adapter ends up behind it. */
interface UploadedImage {
  /** The public address of the stored file, ready to go straight into `logoUrl` or a banner. */
  url: string
}

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/**
 * The one function that sends bytes anywhere in this app. Every image field goes through it, so
 * landing a storage adapter touches `src/app/api/uploads/route.ts` and nothing else.
 *
 * No `content-type` header is set on purpose: the browser writes it for a `FormData` body, with
 * the multipart boundary it generated. Setting it by hand produces a body the server cannot parse.
 */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append("file", file)

  const response = await fetch("/api/uploads", { method: "POST", body })

  if (!response.ok) {
    throw new UploadError(errorCodeOf(await response.json().catch(() => null)))
  }

  const uploaded = (await response.json()) as UploadedImage

  if (typeof uploaded.url !== "string" || uploaded.url === "") {
    throw new UploadError("UNKNOWN")
  }

  return uploaded.url
}
