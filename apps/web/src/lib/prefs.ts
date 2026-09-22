/**
 * The small, non-secret choices a person makes about the panel's chrome.
 *
 * A cookie and not web storage, and the gate that says so is absolute: `web/no-web-storage` runs at
 * a zero baseline over both workspaces, and [BEE-1](../../../../docs/plans/2026-09-20--BEE-1--migracao-bee-link.md)
 * recorded the decision as "prefer the cookie, not the exception". A cookie also arrives on the
 * server, which is the whole point here — the rail can be rendered already collapsed instead of
 * being drawn open and then jumping.
 *
 * One cookie holding an object rather than one cookie per preference: the next preference is a key,
 * not another round trip's worth of header. The `bl_` prefix is not decoration — a cookie on a
 * shared parent domain reaches every app under it, which is why `session-cookies.ts` states the
 * same rule for the session pair.
 *
 * **Nothing here touches `next/headers`, and that is the constraint this file exists under.** The
 * panel's shell is a Client Component and needs the cookie's name and lifetime to write it; a
 * module that reaches for a request API cannot be imported from one at all, and Next refuses the
 * build rather than the call. So the reading of the request happens at the request boundary, in
 * `signed-in-shell.tsx`, and what lives here is only what both sides can hold.
 */
export const PREFS_COOKIE = "bl_prefs"

/** A year. A preference the person set by hand should outlive the session that set it. */
export const PREFS_MAX_AGE = 31_536_000

export interface Prefs {
  /** The admin rail is icons only. Desktop alone — below `lg` the rail is a drawer. */
  railCollapsed: boolean
}

export const DEFAULT_PREFS: Prefs = { railCollapsed: false }

/**
 * Whatever is in the cookie, narrowed to what we understand.
 *
 * Nothing here throws. The value is written by a browser we do not control and survives deploys
 * that changed its shape, so a malformed cookie has to read as "no preference" rather than as a
 * crash on every signed-in page.
 */
export function parsePrefs(raw: string | undefined): Prefs {
  if (!raw) return DEFAULT_PREFS

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFS

    const held = parsed as Record<string, unknown>

    return {
      railCollapsed:
        typeof held.railCollapsed === "boolean" ? held.railCollapsed : DEFAULT_PREFS.railCollapsed,
    }
  } catch {
    return DEFAULT_PREFS
  }
}
