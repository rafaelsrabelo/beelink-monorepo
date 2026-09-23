"use client"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What `component-items.schema.ts` allows for a BANNER. Stated here so the form stops before the API does. */
const MAX_SLIDES = 20

// Block
import { BannerSlideCard } from "./banner-slide-card"
import type { Target, TargetOption } from "./target-fields"

/** The destination vocabulary is the shared one; these names are what the slide's callers use. */
export type SlideTarget = Target
export type SlideTargetOption = TargetOption

/**
 * One picture of a banner, as the form holds it.
 *
 * The destination is an **id**, never an address: a slide pointing at `/lessari/blusas` would be a
 * dead link the day that category was renamed, and that failure is what got a whole table deleted
 * once. `""` stands in for null, because a select cannot hold null.
 */
export interface SlideValue {
  id: string
  imageUrl: string
  title: string
  subtitle: string
  target: SlideTarget
  categoryId: string
  productId: string
  externalUrl: string
}

export interface BannerSlidesFieldProps {
  value: readonly SlideValue[]
  onChange: (value: SlideValue[]) => void
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  /** Ids are the screen's to mint — this package has no clock and no randomness of its own. */
  newSlideId: () => string
  messages?: UiMessages
}

/**
 * The pictures of one banner, in order.
 *
 * **One is a poster; several are a carousel, and there is no switch.** That is the whole of how a
 * carousel is made, and it is the shape the shopkeeper asked for in as many words: "é melhor em um
 * componente de banner eu poder arrastar mais de um item e ele virar um carousel". The version
 * before this made a carousel out of two adjacent banners, and they said it was confusing both to
 * build and to read.
 */
export function BannerSlidesField({
  value,
  onChange,
  categories,
  products,
  onUploadImage,
  imagePending = false,
  newSlideId,
  messages = defaultMessages,
}: BannerSlidesFieldProps) {
  const text = messages.design

  function move(at: number, by: number) {
    const to = at + by
    if (to < 0 || to >= value.length) return

    const next = [...value]
    const [moved] = next.splice(at, 1)
    if (moved) next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((slide, at) => (
        <BannerSlideCard
          key={slide.id}
          slide={slide}
          at={at}
          total={value.length}
          categories={categories}
          products={products}
          onSet={(next) =>
            onChange(value.map((row, index) => (index === at ? { ...row, ...next } : row)))
          }
          onMove={(by) => move(at, by)}
          onRemove={() => onChange(value.filter((_, index) => index !== at))}
          {...(onUploadImage ? { onUploadImage } : {})}
          imagePending={imagePending}
          messages={messages}
        />
      ))}

      {/*
        The one sentence that names the carousel. Every piece of one already worked — the renderer
        reads the shape off the count, and this field adds, removes and reorders — but no screen
        ever said that a second picture is what makes one, so the owner reported not being able to
        build what was already there. It is said beside the button that does it, and only while
        there is one picture: after that the page shows the answer.
      */}
      {value.length === 1 ? (
        <p className="text-muted-foreground text-xs">{text.carouselHint}</p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        // The API caps a banner at 20 slides; without this the owner could add a 21st, fill it in
        // and watch the save fail with nothing on screen to say why.
        disabled={value.length >= MAX_SLIDES}
        onClick={() =>
          onChange([
            ...value,
            {
              id: newSlideId(),
              imageUrl: "",
              title: "",
              subtitle: "",
              target: "NONE",
              categoryId: "",
              productId: "",
              externalUrl: "",
            },
          ])
        }
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {text.addSlide}
      </Button>
    </div>
  )
}
