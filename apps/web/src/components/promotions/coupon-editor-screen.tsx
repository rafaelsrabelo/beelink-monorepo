"use client"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { CouponForm } from "@harness-monorepo/ui/blocks/promotions/coupon-form"
import { DiscountFormSkeleton } from "@harness-monorepo/ui/blocks/promotions/discount-form-skeleton"
import type { CouponFormIssues, CouponFormValues, HalfTypedDates } from "@harness-monorepo/ui/lib/discount-form"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { couponFormOf, couponPayloadOf, emptyCoupon } from "@/lib/discount-form"
import { couponsAddressOf, couponsHrefOf } from "@/lib/discount-view"
import { useCoupon, useSaveCoupon } from "@/services/promotions/promotion-hooks"
import { DiscountEditorFrame } from "./discount-editor-frame"
import { useDiscountEditor } from "./use-discount-editor"

export interface CouponEditorScreenProps {
  slug: string
  /** Absent means a coupon that does not exist yet. */
  couponId?: string
  messages: UiMessages
  web: WebMessages
}

const NO_ISSUES: CouponFormIssues = {}

/** One coupon, on a page of its own, as a promotion is: read, saved, and then back to the list it was opened from. */
export function CouponEditorScreen({ slug, couponId, messages, web }: CouponEditorScreenProps) {
  const shared = messages.discounts
  const text = shared.coupons
  const router = useRouter()
  const address = couponsAddressOf(useSearchParams())
  const list = couponsHrefOf(slug, address, { page: address.page })
  const existing = useCoupon(slug, couponId ?? "")
  const save = useSaveCoupon(slug)
  const editor = useDiscountEditor<CouponFormValues, CouponFormIssues>(NO_ISSUES)

  // Seeded during render, once — see the promotion's page for why not in an effect.
  if (editor.editing === null) {
    if (!couponId) editor.open(null, emptyCoupon(new Date()))
    else if (existing.data) editor.open(existing.data.id, couponFormOf(existing.data))
  }

  const goToList = () => router.push(list as Parameters<typeof router.push>[0])

  function submit(halfTyped: HalfTypedDates) {
    if (!editor.editing) return
    const result = couponPayloadOf(editor.editing.value, shared.issues, halfTyped)
    if ("issues" in result) return editor.refuse(result.issues)
    save.mutate({ id: editor.editing.id, payload: result.payload }, { onSuccess: goToList })
  }

  /** A field corrected takes back what the API said of the last attempt, as it takes back the field's own issue. */
  function change(value: CouponFormValues) {
    if (save.error) save.reset()
    editor.change(value)
  }

  return (
    <DiscountEditorFrame
      title={couponId ? text.editTitle : text.create}
      backHref={list}
      backLabel={text.title}
      failure={existing.isError ? pageErrorCopy(existing.error, web) : undefined}
      onRetry={() => void existing.refetch()}
      retryLabel={shared.retry}
    >
      {editor.editing ? (
        <CouponForm
          value={editor.editing.value}
          onChange={change}
          issues={editor.editing.issues}
          error={pageErrorCopy(save.error, web)}
          onSubmit={submit}
          onCancel={goToList}
          // Still held once saved: the list is on its way, and a second click would make a second one.
          pending={save.isPending || save.isSuccess}
          messages={messages}
        />
      ) : (
        <DiscountFormSkeleton />
      )}
    </DiscountEditorFrame>
  )
}
