"use client"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreFaviconPreview } from "./store-favicon-preview"
import { StoreImageField } from "./store-image-field"
import { readImageSize } from "./store-image-size"
import type { FieldIssue } from "./store-types"

export interface StoreFaviconFieldProps {
  /** The icon's URL, or `""` when the shop has none. */
  value: string
  onChange: (value: string) => void
  /** What stands in for the icon while there is none, shown in the tab's preview. */
  logoUrl: string
  platformIconUrl?: string
  /** The shop's name, which is what its tab is titled. */
  storeName: string
  onUpload?: (file: File) => Promise<string>
  pending?: boolean
  error?: FieldIssue
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The picture of the shop in a browser tab (BEELINK-312): the image field every picture of a shop
 * uses, with one rule of its own and a preview at the size the picture will really have.
 *
 * The rule is that the image is square. A browser draws a tab's icon in a square whatever it is
 * handed, and nothing here crops or pads a picture — so one that is not square is refused before it
 * is sent, with its measures in the sentence, rather than stored and shown squeezed. An image whose
 * measures cannot be read is let through: that is no verdict, not a refusal.
 */
export function StoreFaviconField({
  value,
  onChange,
  logoUrl,
  platformIconUrl,
  storeName,
  onUpload,
  pending,
  error,
  disabled,
  messages = defaultMessages,
}: StoreFaviconFieldProps) {
  const text = messages.store.favicon

  const refuseUnlessSquare = async (file: File) => {
    const size = await readImageSize(file)
    if (!size || size.width === size.height) return undefined

    return format(text.notSquare, { width: String(size.width), height: String(size.height) })
  }

  return (
    <div className="flex flex-col gap-4">
      <StoreImageField
        id="store-favicon"
        label={text.label}
        hint={text.hint}
        previewAlt={text.alt}
        recommendedSize={{ width: 512, height: 512 }}
        value={value}
        error={error}
        copy={{ dropCta: text.dropCta, replace: text.replace, clear: text.clear }}
        validate={refuseUnlessSquare}
        onUpload={onUpload}
        pending={pending}
        disabled={disabled}
        messages={messages}
        onChange={onChange}
      />
      <StoreFaviconPreview faviconUrl={value} logoUrl={logoUrl} platformIconUrl={platformIconUrl} title={storeName} messages={messages} />
    </div>
  )
}
