"use client"

// React
import { useId, type FormEvent } from "react"

// Libs
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePageContentValues, AffiliatePageIssues, AffiliatePagePreviewView } from "@harness-monorepo/ui/lib/affiliate-page"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AffiliatePageEndingSections, type AffiliatePageEndingPart } from "./affiliate-page-ending-sections"
import { AffiliatePageListsSection } from "./affiliate-page-lists-section"
import { AffiliatePagePreview } from "./affiliate-page-preview"
import { AffiliatePageTopSection } from "./affiliate-page-top-section"

/** A part of the page whose texts go back to the product's own together. */
export type AffiliatePagePart = "top" | "steps" | "benefits" | "questions" | AffiliatePageEndingPart

export interface AffiliatePageEditorProps {
  value: AffiliatePageContentValues
  onChange: (value: AffiliatePageContentValues) => void
  onRestore: (part: AffiliatePagePart) => void
  onSubmit: () => void
  /** The top as a visitor will read it, its marks filled in by the screen. */
  preview: AffiliatePagePreviewView
  backHref: string
  viewHref: string
  onUpload?: (file: File) => Promise<string>
  uploading?: boolean
  uploadError?: string
  issues?: AffiliatePageIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  saved?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Every text of the shop's "Seja afiliado" page (plan 2026-11-14) — the user's call that nothing on
 * it is fixed — with the top's preview beside it. Each part comes back to the product's own texts on
 * its own; the screen decides which typed text is the product's and saves it as such.
 */
export function AffiliatePageEditor({ value, onChange, onRestore, onSubmit, preview, backHref, viewHref, onUpload, uploading = false, uploadError, issues = {}, pending = false, error, saved = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliatePageEditorProps) {
  const text = messages.affiliatePage.editor
  const id = useId()
  const patch = (next: Partial<AffiliatePageContentValues>) => onChange({ ...value, ...next })
  const shared = { value, onChange: patch, issues, disabled: pending, messages }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  const save = (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? text.saving : text.save}
      </Button>
      <p aria-live="polite" className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
        {error ?? (saved ? text.saved : null)}
      </p>
    </div>
  )

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href={backHref} className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {text.back}
          </Link>
          <h1 id={`${id}-title`} className="text-2xl font-semibold">
            {text.title}
          </h1>
        </div>
        <Link href={viewHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          <ExternalLinkIcon aria-hidden="true" />
          {text.view}
        </Link>
      </header>
      <p className="bg-muted rounded-lg p-4 text-sm">{text.marks}</p>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_36rem] flex-col gap-4">
          <AffiliatePageTopSection {...shared} onRestore={() => onRestore("top")} onUpload={onUpload} uploading={uploading} uploadError={uploadError} />
          <AffiliatePageListsSection {...shared} list="steps" onRestore={() => onRestore("steps")} />
          <AffiliatePageListsSection {...shared} list="benefits" onRestore={() => onRestore("benefits")} />
          <AffiliatePageListsSection {...shared} list="questions" onRestore={() => onRestore("questions")} />
          <AffiliatePageEndingSections {...shared} onRestore={onRestore} />
          {save}
        </div>
        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4">
          <AffiliatePagePreview view={preview} messages={messages} />
        </div>
      </div>
    </form>
  )
}
