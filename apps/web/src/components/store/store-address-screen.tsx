"use client"

// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// UI
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { StoreAddressChange } from "@harness-monorepo/ui/blocks/store/store-address-change"
import { StoreAddressChangeSkeleton } from "@harness-monorepo/ui/blocks/store/store-address-change-skeleton"
import { storeAddressOf } from "@harness-monorepo/ui/lib/store-address"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { addressChangeErrorOf, availabilityOf, CHANGED_KEY, storeAddressPageOf } from "@/lib/store-address"
import { dayInWords } from "@/lib/subscription-dates"
import { DEBOUNCE_MS } from "@/services/addresses/address-hooks"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useChangeStoreSlug, useStore, useStoreSlugAvailability } from "@/services/stores/store-hooks"

export interface StoreAddressScreenProps {
  slug: string
  /** What every page's address starts with, as read: `beelink.biz/`. */
  prefix: string
  /** The page just arrived here from a change: it says so. */
  changed: boolean
  /** The way back — the page's settings — and what it is called. */
  back: { href: string; label: string }
  locale: string
  ui: UiMessages
  web: WebMessages
}

/**
 * A page's new address (BEELINK-331), on its own screen under the page's settings. What is typed is
 * shown as the API would store it at once, and the API is asked whether it is free after a pause.
 * The change goes to the new address in the panel — the same screen, saying it is done — with no
 * signing out: the page's answer is kept under its new address before the panel goes there.
 */
export function StoreAddressScreen({ slug, prefix, changed, back, locale, ui, web }: StoreAddressScreenProps) {
  const text = ui.store.addressChange
  const router = useRouter()
  const store = useStore(slug)
  const [typed, setTyped] = useState("")
  const preview = storeAddressOf(typed)
  const asked = useDebouncedValue(preview, DEBOUNCE_MS)
  const availability = useStoreSlugAvailability(slug, asked)
  const change = useChangeStoreSlug(slug)

  // Until the block is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.title}</h1>
  if (store.isPending) return <IntegrationFrame back={back} result={null}>{untitled}<StoreAddressChangeSkeleton /></IntegrationFrame>
  if (store.isError) return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={() => void store.refetch()} message={text.failed} messages={ui} /></IntegrationFrame>

  const current = store.data
  const done = changed ? { tone: "done" as const, message: format(text.changed, { address: `${prefix}${current.slug}` }) } : null

  return (
    <IntegrationFrame back={back} result={done}>
      <StoreAddressChange
        currentAddress={`${prefix}${current.slug}`}
        prefix={prefix}
        value={typed}
        onValueChange={(value) => {
          change.reset()
          setTyped(value)
        }}
        preview={preview}
        availability={availabilityOf(preview, asked, availability)}
        lockedUntil={current.slugChangeableOn ? dayInWords(current.slugChangeableOn, locale) : null}
        customDomain={current.customDomain?.host ?? null}
        onConfirm={() =>
          change.mutate(
            { slug: preview },
            { onSuccess: (moved) => router.replace(`${storeAddressPageOf(moved.slug)}?${CHANGED_KEY}=1` as Parameters<typeof router.replace>[0]) },
          )
        }
        pending={change.isPending || change.isSuccess}
        error={change.isError ? addressChangeErrorOf(change.error, text, web.errors, locale) : undefined}
        messages={ui}
      />
    </IntegrationFrame>
  )
}
