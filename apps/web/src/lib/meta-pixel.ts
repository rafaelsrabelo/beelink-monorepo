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
  /**
   * Which way consent was last turned. The library's consent is one lock for the whole tab, and
   * whatever is called while it is shut is kept and sent at the next grant — so nothing is ever
   * called without a yes.
   */
  granted: boolean
}

const states = new WeakMap<Fbq, PixelState>()

function stateOf(fbq: Fbq): PixelState {
  const state = states.get(fbq) ?? { started: new Set<string>(), granted: false }
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

/**
 * This shop's pixel, ready to be told things: consent granted, and the pixel started if this tab
 * has not started it yet. Automatic collection is switched off before `init`, as Meta asks, so the
 * pixel gathers no button click or page metadata of its own; and nothing of the visitor's is given
 * to `init` for matching.
 */
function start(pixelId: string): Fbq {
  const fbq = queueOf()
  const state = stateOf(fbq)

  if (!state.granted) {
    fbq("consent", "grant")
    state.granted = true
  }
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
  const state = window.fbq ? stateOf(window.fbq) : null
  if (!window.fbq || !state?.granted) return

  window.fbq("consent", "revoke")
  state.granted = false
}

/** One event, to one shop's pixel and no other. */
export function sendToMetaPixel(pixelId: string, event: MetaPixelEvent, eventId: string): void {
  start(pixelId)("trackSingle", pixelId, event.name, event.params, { eventID: eventId })
}
