"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState } from "react"

// Types
import type { StorePage } from "@harness-monorepo/contracts"

// App
import { PageRequestError } from "@/services/page/page-call"
import { useApplyTemplate } from "@/services/page/page-template-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { withChoice } from "./template-choice-address"
import type { OfferedTemplate } from "./template-offer"
import type { useDesignDraft } from "./use-design-draft"

export interface TemplateApplyInput {
  slug: string
  /** The page the editor has open: the write names its revision, so it can be no other. */
  page: StorePage
  draft: Pick<ReturnType<typeof useDesignDraft>, "publish">
  /** The product the product models are built around, or null while none is chosen. */
  productId: string | null
  /** The model is in the draft: the gallery closes. */
  onApplied: () => void
}

/**
 * Applying a model, with the question first: which one is being asked about, the write, and what
 * follows it.
 *
 * The write waits for whatever the editor still has on its way to the draft, as Publicar does —
 * an arrangement saved a moment late would land on the model's bands naming ids that are gone.
 *
 * A stale draft (409) is answered by the editor's conflict dialog, whose one way on is a reload.
 * The choice is written into the address first, so the gallery opens on it again afterwards.
 */
export function useTemplateApply({ slug, page, draft, productId, onApplied }: TemplateApplyInput) {
  const router = useRouter()
  const apply = useApplyTemplate(slug, page.id)
  const [asking, setAsking] = useState<OfferedTemplate | null>(null)
  // From the confirmation to the answer: the editor's own saves go first, and are not the mutation's.
  const [sending, setSending] = useState(false)

  const confirm = () => {
    if (!asking || sending) return
    const template = asking
    const chosenProduct = template.needsProduct ? productId : null

    setSending(true)
    draft.publish(() =>
      apply.mutate(
        { template: template.id, ...(chosenProduct ? { productId: chosenProduct } : {}) },
        {
          onSuccess: () => {
            setAsking(null)
            useDesignPages.getState().noteApplied({ pageId: page.id, templateId: template.id })
            // The preview's shelves are the page's server read, as after a restore.
            router.refresh()
            onApplied()
          },
          onError: (error) => {
            if (!(error instanceof PageRequestError) || error.errorCode !== "PAGE_DRAFT_STALE") return
            window.history.replaceState(null, "", withChoice(window.location.href, { templateId: template.id, productId: chosenProduct }))
            setAsking(null)
          },
          onSettled: () => setSending(false),
        },
      ),
    )
  }

  return {
    asking,
    ask: (template: OfferedTemplate) => {
      apply.reset()
      setAsking(template)
    },
    cancel: () => {
      setAsking(null)
      apply.reset()
    },
    confirm,
    applying: sending,
    error: apply.error,
  }
}
