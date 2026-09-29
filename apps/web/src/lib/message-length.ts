/** The API's limit on a message, counted as the database counts it: in code points, so an emoji is one. */
export const MESSAGE_MAX = 2000

/** How long a draft is as the API measures it: trimmed, in code points. */
export function messageLengthOf(draft: string): number {
  return [...draft.trim()].length
}
