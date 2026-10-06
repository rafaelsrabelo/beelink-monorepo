// App
import type { MetaPixelEvent } from "./meta-pixel-event"

/**
 * Meta's pixel library, and the only file that names `fbq` (BEELINK-272). Browser only: every
 * function here is called from an effect or a handler, after `marketingAllowed()` said yes.
 *
 * Shops share one domain and one tab can hold two of them, so nothing here is ever sent to "the
 * pixels on the page": a pixel is started once per id, and every event is addressed to one.
 */

/** Where the library lives. A constant: the shop's id is an argument of `fbq`, never part of a script. */
export const META_PIXEL_SRC = "https://connect.facebook.net/en_US/fbevents.js"

type FbqArguments =
  | [command: "consent", action: "grant" | "revoke"]
  | [command: "set", setting: "autoConfig" | "trackSingleOnly", value: boolean, pixelId: string]
  | [command: "init", pixelId: string]
  | [command: "trackSingle", pixelId: string, name: string, params: MetaPixelEvent["params"], data: { eventID: string }]

/** The queue Meta's base code creates before its library arrives; the library then answers through `callMethod`. */
interface Fbq {
  (...args: FbqArguments): void
  callMethod?: (...args: FbqArguments) => void
  queue: FbqArguments[]
  push: Fbq
  loaded: boolean
  version: string
  disablePushState: boolean
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

/**
 * What this tab's library was told, kept beside the library's own function so the two live and die
 * together.
 */
interface PixelState {
  /** The ids started. The tab's and not a shop's: `init` piles up, and a second one for the same id is a second pixel. */
  started: Set<string>
  /** Which way consent was last turned. */
  granted: boolean
  /** A shop's pages were left, and no other shop's have said yes since. */
  leaving: boolean
}

const states = new WeakMap<Fbq, PixelState>()

function stateOf(fbq: Fbq): PixelState {
  const state = states.get(fbq) ?? { started: new Set<string>(), granted: true, leaving: false }
  states.set(fbq, state)
  return state
}

function queueOf(): Fbq {
  if (window.fbq) return window.fbq

  // Meta's base code, as a typed function instead of an injected script: calls wait in `queue` until the library takes over.
  const fbq = ((...args: FbqArguments) => {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  }) as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []
  // Left on, the library sends a PageView to every started pixel at each pushState — another shop's included.
  fbq.disablePushState = true

  window.fbq = fbq
  window._fbq ??= fbq
  return fbq
}

/** The calls still waiting for the library, without the ones `drop` names. In place: the library reads this very array. */
function unqueue(fbq: Fbq, drop: (call: FbqArguments) => boolean): void {
  fbq.queue.splice(0, fbq.queue.length, ...fbq.queue.filter((call) => !drop(call)))
}

/**
 * The library's consent is one lock for the whole tab: `revoke` shuts it, and whatever is called
 * while it is shut is kept and sent at the next `grant`. So nothing is ever called without a yes.
 *
 * Before the library arrives the queue is still ours, and it must never hold a `revoke` with a
 * `grant` behind it: the library stops reading its queue at the lock, and would never reach the
 * grant. There, consent is turned by editing the queue instead.
 */
function turn(fbq: Fbq, granted: boolean): void {
  const state = stateOf(fbq)
  state.leaving = false
  if (state.granted === granted) return
  state.granted = granted

  if (fbq.callMethod) return fbq("consent", granted ? "grant" : "revoke")

  if (granted) return unqueue(fbq, ([command]) => command === "consent")
  // What was told and has not left yet does not leave after a no.
  unqueue(fbq, ([command]) => command === "trackSingle")
  fbq("consent", "revoke")
}

/**
 * This shop's pixel, ready to be told things: consent granted, and the pixel started if this tab
 * has not started it yet. Automatic collection is switched off before `init`, as Meta asks, so the
 * pixel gathers no button click or page metadata of its own; and nothing of the visitor's is given
 * to `init` for matching.
 */
function start(pixelId: string): Fbq {
  const fbq = queueOf()
  const state = stateOf(fbq)

  turn(fbq, true)
  if (!state.started.has(pixelId)) {
    state.started.add(pixelId)
    fbq("set", "autoConfig", false, pixelId)
    fbq("init", pixelId)
    // After init, which is when the pixel exists to be set: a bare `track` no longer reaches it.
    fbq("set", "trackSingleOnly", true, pixelId)
  }
  return fbq
}

/** Called once the visitor said yes at this shop, so the queue exists before the library arrives. */
export function startMetaPixel(pixelId: string): void {
  start(pixelId)
}

/**
 * The visitor's yes does not stand here — taken back, or never given at the shop the tab moved to.
 * The library, if this tab ever loaded it, stops sending. Meta's cookies stay: they are the
 * domain's, and another shop's yes may rest on them.
 */
export function stopMetaPixel(): void {
  if (window.fbq) turn(window.fbq, false)
}

/**
 * A shop's pages were left. If no shop's pages say yes in the same breath — the next shop's, or
 * these very ones mounted again — the library is shut: outside a shop that was given a yes, nothing
 * is there to tell it anything, and it is not left open to find out.
 */
export function leaveMetaPixel(): void {
  const fbq = window.fbq
  if (!fbq) return

  const state = stateOf(fbq)
  state.leaving = true
  queueMicrotask(() => {
    if (state.leaving) turn(fbq, false)
  })
}

/** One event, to one shop's pixel and no other. */
export function sendToMetaPixel(pixelId: string, event: MetaPixelEvent, eventId: string): void {
  start(pixelId)("trackSingle", pixelId, event.name, event.params, { eventID: eventId })
}
