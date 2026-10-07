"use client"

// React
import { useState, type ReactNode } from "react"

// UI
import { DiscountFormSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-form-skeleton"
import { PopupForm } from "@harness-monorepo/ui/blocks/promotions/popup-form"
import { PopupPreview } from "@harness-monorepo/ui/blocks/promotions/popup-preview"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import type { PopupFormIssues, PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { figtree } from "@/components/storefront/shop-font"
import { popupAnnouncingOf, popupChoicesOf, popupDefaultsOf, popupErrorOf, popupFormOf, popupPayloadOf, previewBenefitOf, previewCustomerWordsOf, previewWordsOf } from "@/lib/popup-form"
import { usePopup, useSavePopup } from "@/services/promotions/popup-hooks"
import { DiscountError } from "@/services/promotions/promotion-requests"
import { useStore } from "@/services/stores/store-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface PopupScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const NO_ISSUES: PopupFormIssues = {}

/**
 * The shop's first-purchase pop-up, as its shopkeeper sets it (BEELINK-306): the preview over the
 * form. The form starts from the pop-up as saved and holds what is typed until it is saved again;
 * the preview follows every keystroke, in the shop's own colours and typeface, and draws its words
 * with the function the shop window draws them with — so what is seen here is what a visitor reads,
 * with the benefit as it stands now. It draws the notice of a signed-in customer who never ordered
 * too (BEELINK-310), from the offer the API says is theirs.
 *
 * The shop is read for its colours alone. Both reads are waited for: a preview painted in the
 * panel's colours for a moment would be a preview of another shop.
 */
export function PopupScreen({ slug, locale, messages }: PopupScreenProps) {
  const text = messages.discounts.popup
  const overview = usePopup(slug)
  const store = useStore(slug)
  const save = useSavePopup(slug)
  const image = useImageUpload()
  // What was typed since the pop-up was read; null shows it as saved.
  const [typed, setTyped] = useState<PopupFormValues | null>(null)
  const [issues, setIssues] = useState<PopupFormIssues>(NO_ISSUES)

  if (overview.isPending || store.isPending) {
    return (
      <Frame slug={slug} text={text}>
        <DiscountFormSkeleton />
      </Frame>
    )
  }
  if (overview.isError || store.isError) {
    return (
      <Frame slug={slug} text={text}>
        <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
          <p className="text-sm">{text.failed}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void Promise.all([overview.refetch(), store.refetch()])}>
            {text.retry}
          </Button>
        </div>
      </Frame>
    )
  }

  const value = typed ?? popupFormOf(overview.data.settings)
  const benefit = previewBenefitOf(overview.data, value.benefit)

  function change(next: PopupFormValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  function submit() {
    const result = popupPayloadOf(value, text.issues)
    if ("issues" in result) return setIssues(result.issues)
    save.mutate(result.payload, { onSuccess: () => setTyped(null) })
  }

  return (
    <Frame slug={slug} text={text}>
      <PopupPreview
        words={previewWordsOf(value, benefit, locale, messages)}
        customerWords={previewCustomerWordsOf(overview.data, locale, messages)}
        imageUrl={value.imageUrl.trim() || null}
        announcing={popupAnnouncingOf(value, benefit, locale, messages)}
        style={{ ...shopPaletteVariables(store.data.colors), fontFamily: figtree.style.fontFamily }}
        messages={messages}
      />
      <PopupForm
        value={value}
        onChange={change}
        onSubmit={submit}
        issues={issues}
        choices={popupChoicesOf(overview.data, value.benefit, locale, messages)}
        defaults={popupDefaultsOf(benefit, locale, messages)}
        onUploadImage={image.upload}
        imagePending={image.pending}
        pending={save.isPending}
        error={save.error ? popupErrorOf(save.error instanceof DiscountError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
        saved={save.isSuccess}
        messages={messages}
      />
    </Frame>
  )
}

function Frame({ slug, text, children }: { slug: string; text: UiMessages["discounts"]["popup"]; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        <AppLink href={`/admin/${slug}/coupons`} className={buttonVariants({ variant: "outline" })}>
          {text.back}
        </AppLink>
      </header>
      {children}
    </div>
  )
}
