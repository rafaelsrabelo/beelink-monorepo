"use client"

// Libs
import { useMutation } from "@tanstack/react-query"

// App
import { uploadImage } from "./upload-requests"

export interface ImageUploadHandle {
  /**
   * Resolves with the stored file's URL and **rejects** when the upload was refused, which is what
   * the image field's `onUpload` contract asks for: the field awaits the URL to write it into the
   * form, and it catches the refusal itself so that a failed upload leaves the field holding what
   * it held before rather than holding nothing.
   *
   * It is deliberately not the postcode lookup's shape. That one resolves with `null` because the
   * block calls it from a click handler and drops the promise, so a rejection there would be an
   * unhandled one; this is awaited inside a `try`.
   */
  upload: (file: File) => Promise<string>
  pending: boolean
  /** The last refusal, for the screen to turn into a sentence. Cleared by the next attempt. */
  error: Error | null
  reset: () => void
}

/**
 * The upload as a field uses it. One hook for every image in the panel — a logo, a banner, and the
 * product pictures of the next phase — because there is one endpoint and one adapter behind it.
 */
export function useImageUpload(): ImageUploadHandle {
  const mutation = useMutation({ mutationFn: uploadImage })

  return {
    upload: mutation.mutateAsync,
    pending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
