"use client"

// React
import { useEffect, useState, type ReactNode } from "react"

// UI
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@harness-monorepo/ui/components/carousel"
import { useReducedMotion } from "@harness-monorepo/ui/hooks/use-reduced-motion"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface AuthPhotosProps {
  /** Each drawn to fill the box it is given — the app hands its own optimised images in. */
  photos: readonly ReactNode[]
  /** Names the carousel for a reader. */
  label: string
  /** "Foto {current} de {total}": what each dot is called. */
  position: string
  /** How long a photo stays before the next one comes, in milliseconds. */
  pace?: number
}

/**
 * The brand's photographs beside the signed-out forms, one at a time: they pass by themselves, and
 * the dots under them say which is showing and take a reader to any of them. No arrows — the dots
 * and the arrow keys are the whole of the controls.
 *
 * It stops passing while a pointer is over it or a key holds one of its dots, so nobody has a photo
 * taken from under them, and it never passes for someone who asked their system for less movement.
 *
 * A Client Component that imports no dictionary, like the landing's: it takes its two sentences.
 */
export function AuthPhotos({ photos, label, position, pace = 6000 }: AuthPhotosProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [held, setHeld] = useState(false)
  const still = useReducedMotion()

  useEffect(() => {
    if (!api) return

    const follow = () => setCurrent(api.selectedScrollSnap())
    api.on("select", follow)
    return () => {
      api.off("select", follow)
    }
  }, [api])

  useEffect(() => {
    if (!api || held || still) return

    // The shell hides the photos on a narrow screen, and a hidden carousel has nothing to pass.
    const timer = setInterval(() => {
      if (api.rootNode().offsetParent) api.scrollNext()
    }, pace)
    return () => clearInterval(timer)
  }, [api, held, still, pace])

  return (
    <Carousel
      aria-label={label}
      opts={{ loop: true, duration: still ? 0 : 35 }}
      setApi={setApi}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="size-full *:data-[slot=carousel-content]:h-full"
    >
      <CarouselContent className="ml-0 h-full">
        {photos.map((photo, at) => (
          <CarouselItem key={at} className="relative h-full pl-0">
            {photo}
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute inset-x-0 bottom-8 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-brand-ink/55 px-3 py-1.5 backdrop-blur-sm">
          {photos.map((_photo, at) => (
            // The button is the 24px a pointer needs; the dot inside it is what is seen.
            <button
              key={at}
              type="button"
              aria-label={position.replace("{current}", String(at + 1)).replace("{total}", String(photos.length))}
              aria-current={at === current ? "true" : undefined}
              onClick={() => api?.scrollTo(at)}
              className="flex h-6 min-w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-on-ink"
            >
              <span className={cn("h-2 rounded-full transition-all", at === current ? "w-7 bg-brand-yellow" : "w-2 bg-brand-on-ink/70")} />
            </button>
          ))}
        </div>
      </div>
    </Carousel>
  )
}
