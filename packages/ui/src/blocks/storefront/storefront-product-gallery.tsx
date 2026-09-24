"use client"

// React
import { useState } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontProductImage {
  id: string
  url: string
  alt: string | null
}

export interface StorefrontProductGalleryProps {
  images: readonly StorefrontProductImage[]
  /** Said for a photo with no alt of its own. */
  name: string
  messages?: UiMessages
}

/**
 * The product's photos: one large, and a thumbnail for each.
 *
 * Which photo is shown is state about looking rather than about the shop: not worth an address,
 * and putting it in one would make every thumbnail a new entry in someone's history. The page
 * remounts this with a new key when a combination brings a photo of its own, so it opens on it.
 */
export function StorefrontProductGallery({ images, name, messages = defaultMessages }: StorefrontProductGalleryProps) {
  const text = messages.storefront
  const [shown, setShown] = useState(0)
  const current = images[shown] ?? images[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-black/5">
        {current ? (
          <img src={current.url} alt={current.alt ?? name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm opacity-50">{text.noPhoto}</div>
        )}
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((image, at) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setShown(at)}
                // The pressed state and not a colour alone: which thumbnail is showing has to be
                // answerable without seeing the ring.
                aria-pressed={at === shown}
                // Without this the button holds only an aria-hidden image, and a screen reader
                // announces it as "button" and nothing else — axe calls it button-name, and it
                // is right: the picture is decorative, so the name has to come from somewhere.
                aria-label={image.alt ?? format(text.photoOf, { n: String(at + 1), total: String(images.length) })}
                className={cn(
                  "size-16 shrink-0 overflow-hidden rounded-lg bg-black/5",
                  at === shown ? "opacity-100" : "opacity-60",
                )}
                style={at === shown ? { boxShadow: "0 0 0 2px var(--shop-primary)" } : undefined}
              >
                <img src={image.url} alt="" aria-hidden="true" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
