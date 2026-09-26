"use client"

// Next
import { useRouter } from "next/navigation"

// React
import { useState } from "react"

// Types
import type { StorePage } from "@harness-monorepo/contracts"

// UI
import { PageSettingsDialog, type PageSettingsValue } from "@harness-monorepo/ui/blocks/design/page-settings-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { usePages, useUpdatePage } from "@/services/page/store-pages-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { pageErrorCopy } from "./page-error-copy"
import { useAddressCheck } from "./use-address-check"

export interface PageSettingsProps {
  slug: string
  /** The page being edited, whose own read is taken again when its settings change. */
  currentPageId: string | null
  messages: UiMessages
  web: WebMessages
}

function valueOf(page: StorePage): PageSettingsValue {
  return {
    title: page.title,
    slug: page.slug ?? "",
    display: { inMenu: page.inMenu, usesChrome: page.usesChrome },
    seo: { title: page.seo.title ?? "", description: page.seo.description ?? "", imageUrl: page.seo.imageUrl ?? "" },
  }
}

/**
 * A landing's settings, wired: opened from its row in the Páginas tab, saved as one patch. Only what
 * changed is sent, so a save never writes back a field another tab changed meanwhile. A blank search
 * field is sent as null, which is how the API clears it back to the page's name.
 */
export function PageSettings({ slug, currentPageId, messages, web }: PageSettingsProps) {
  const router = useRouter()
  const dialog = useDesignPages((state) => state.dialog)
  const close = useDesignPages((state) => state.close)
  const pages = usePages(slug)
  const update = useUpdatePage(slug)
  const page = dialog?.kind === "settings" ? (pages.data?.find((row) => row.id === dialog.pageId) ?? null) : null
  const [edited, setEdited] = useState<{ pageId: string; value: PageSettingsValue } | null>(null)
  const value = page ? (edited?.pageId === page.id ? edited.value : valueOf(page)) : null
  const addressState = useAddressCheck(page ? slug : "", value && value.slug !== page?.slug ? value.slug : "", page?.id)

  const dismiss = () => {
    close()
    update.reset()
    setEdited(null)
  }

  const submit = () => {
    if (!page || !value) return
    const was = valueOf(page)
    const orNull = (text: string) => text.trim() || null

    update.mutate(
      {
        pageId: page.id,
        payload: {
          ...(value.title !== was.title ? { title: value.title.trim() } : {}),
          ...(value.slug !== was.slug ? { slug: value.slug } : {}),
          ...(value.display.inMenu !== was.display.inMenu ? { inMenu: value.display.inMenu } : {}),
          ...(value.display.usesChrome !== was.display.usesChrome ? { usesChrome: value.display.usesChrome } : {}),
          seo: {
            ...(value.seo.title !== was.seo.title ? { title: orNull(value.seo.title) } : {}),
            ...(value.seo.description !== was.seo.description ? { description: orNull(value.seo.description) } : {}),
            ...(value.seo.imageUrl !== was.seo.imageUrl ? { imageUrl: orNull(value.seo.imageUrl) } : {}),
          },
        },
      },
      {
        onSuccess: () => {
          dismiss()
          // The screen's own read of this page carries its frame and its status.
          if (page.id === currentPageId) router.refresh()
        },
      },
    )
  }

  if (!page || !value) return null

  return (
    <PageSettingsDialog
      open
      onOpenChange={(next) => (next ? undefined : dismiss())}
      value={value}
      onChange={(next) => setEdited({ pageId: page.id, value: next })}
      addressPrefix={`/${slug}/lp/`}
      addressState={addressState}
      onSubmit={submit}
      pending={update.isPending}
      error={update.error ? (pageErrorCopy(update.error, web) ?? null) : null}
      messages={messages}
    />
  )
}
