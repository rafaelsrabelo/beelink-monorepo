/**
 * The manager's bell (plan 2026-11-10--modo-gestor), drawn with the Web Audio API: no file to load
 * or license, and it plays the same on every device. A browser keeps a page's audio suspended until
 * the page gets a tap — `unlock` is called from one; before it, `ring` is silent, never an error.
 */
export interface GestorBell {
  unlock: () => Promise<void>
  ring: () => void
}

/** Two "ding-dongs": high, low, a breath, again. Seconds from the start, and the note's pitch in hertz. */
const STRIKES: ReadonlyArray<readonly [number, number]> = [
  [0, 1318.5],
  [0.18, 987.8],
  [0.6, 1318.5],
  [0.78, 987.8],
]

type AudioContextClass = typeof AudioContext

function audioContextClass(): AudioContextClass | null {
  if (typeof window === "undefined") return null
  const prefixed = (window as Window & { webkitAudioContext?: AudioContextClass }).webkitAudioContext
  return window.AudioContext ?? prefixed ?? null
}

function strike(context: AudioContext, at: number, frequency: number): void {
  const tone = context.createOscillator()
  const volume = context.createGain()
  tone.type = "triangle"
  tone.frequency.setValueAtTime(frequency, at)
  volume.gain.setValueAtTime(0.0001, at)
  volume.gain.exponentialRampToValueAtTime(0.6, at + 0.01)
  volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.5)
  tone.connect(volume).connect(context.destination)
  tone.start(at)
  tone.stop(at + 0.55)
}

export function createGestorBell(): GestorBell {
  let context: AudioContext | null = null
  const contextOf = (): AudioContext | null => {
    if (context) return context
    const Context = audioContextClass()
    context = Context ? new Context() : null
    return context
  }

  return {
    unlock: async () => {
      const audio = contextOf()
      if (audio?.state === "suspended") await audio.resume()
    },
    ring: () => {
      const audio = contextOf()
      if (audio?.state !== "running") return
      for (const [offset, frequency] of STRIKES) strike(audio, audio.currentTime + offset, frequency)
    },
  }
}
