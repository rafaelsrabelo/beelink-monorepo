export interface ImageSize {
  width: number
  height: number
}

/**
 * What a picked image measures, read in the browser before a byte is sent. Null where it cannot be
 * read — a browser without `createImageBitmap`, a file that is not a picture after all — and a
 * caller treats that as "no verdict", never as a refusal: whoever stores the bytes still has its say.
 */
export async function readImageSize(file: File): Promise<ImageSize | null> {
  if (typeof createImageBitmap !== "function") return null

  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}
