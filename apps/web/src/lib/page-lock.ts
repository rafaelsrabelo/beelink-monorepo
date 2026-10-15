/**
 * An answer that says the page is locked for want of payment (BEELINK-223): every route of its panel
 * but its subscription's answers so until it is paid, so asking again at once changes nothing.
 */
export function isPageLockedError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "errorCode" in error && error.errorCode === "PAGE_LOCKED"
}
