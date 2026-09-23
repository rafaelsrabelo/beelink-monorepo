"use client"

// React
import { useState } from "react"

// Types
import type { Section } from "@harness-monorepo/contracts"

// UI
import { BandForm } from "@harness-monorepo/ui/blocks/design/band-form"
import type { BandFormValues } from "@harness-monorepo/ui/blocks/design/band-form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@harness-monorepo/ui/components/sheet"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useUpdateSection } from "@/services/page/page-hooks"

export interface BandEditorProps {
  slug: string
  /** The band being edited, or null while the sheet is closed. */
  section: Section | null
  /** Where it sits, one-based, because a band has no name and is called by its place. */
  position: number
  /** The page's own background, so turning a band's colour on starts somewhere visible. */
  pageBackground: string
  onClose: () => void
  messages: UiMessages
}

/**
 * A band's own attributes, in a sheet beside the page.
 *
 * Saved straight to the API, for the reason the component editor states: a colour and a width are
 * things the owner wants to see land, not an arrangement to hold back until Publish.
 */
export function BandEditor({ slug, section, position, pageBackground, onClose, messages }: BandEditorProps) {
  return (
    <Sheet open={section !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {section ? (
          <BandEditorBody
            key={section.id}
            slug={slug}
            section={section}
            position={position}
            pageBackground={pageBackground}
            onClose={onClose}
            messages={messages}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function BandEditorBody({
  slug,
  section,
  position,
  pageBackground,
  onClose,
  messages,
}: Omit<BandEditorProps, "section"> & { section: Section }) {
  const text = messages.design
  const [value, setValue] = useState<BandFormValues>({
    width: section.width,
    background: section.background ?? "",
  })
  const update = useUpdateSection(slug)

  return (
    <>
      <SheetHeader>
        <SheetTitle>{format(text.bandNumber, { position: String(position) })}</SheetTitle>
        <SheetDescription>{text.bandWidthHelp}</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-4">
        <BandForm
          value={value}
          onChange={setValue}
          pageBackground={pageBackground}
          onSubmit={() =>
            update.mutate(
              {
                sectionId: section.id,
                // Empty is "the page's own", which on the wire is null and not `""`.
                payload: { width: value.width, background: value.background || null },
              },
              { onSuccess: onClose },
            )
          }
          onCancel={onClose}
          pending={update.isPending}
          messages={messages}
        />
      </div>
    </>
  )
}
