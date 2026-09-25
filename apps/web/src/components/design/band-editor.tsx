"use client"

// React
import { useState } from "react"

// Types
import type { Section } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { BandStyleFields, type BandFormValues } from "@harness-monorepo/ui/blocks/design/band-style-fields"
import { InspectorTabs } from "@harness-monorepo/ui/blocks/design/inspector-tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@harness-monorepo/ui/components/sheet"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useUpdateSection } from "@/services/page/page-hooks"

export interface BandEditorProps {
  slug: string
  /** The band being edited, or null while the sheet is closed. */
  section: Section | null
  /** Where it sits, one-based: what an unnamed band is called by. */
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
    name: section.name ?? "",
    width: section.width,
    background: section.background ?? "",
  })
  const update = useUpdateSection(slug)
  // The strip's band is drawn above the header, edge to edge, whatever its width says — so the
  // width is not offered there, and the sheet says why instead of promising "ponta a ponta".
  const isStrip = section.components.length > 0 && section.components.every((component) => component.kind === "ANNOUNCEMENT")

  return (
    <>
      <SheetHeader>
        {/* What is being typed, not what was saved: renaming the band renames the sheet as it goes. */}
        <SheetTitle>{bandLabelOf(value.name, position, messages)}</SheetTitle>
        <SheetDescription>{isStrip ? text.stripBandHelp : text.bandWidthHelp}</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-4">
        <InspectorTabs
          tab="style"
          onTabChange={() => undefined}
          name={bandLabelOf(value.name, position, messages)}
          style={<BandStyleFields value={value} onChange={setValue} strip={isStrip} pageBackground={pageBackground} messages={messages} />}
          onSubmit={() =>
            update.mutate(
              {
                sectionId: section.id,
                // Empty is "the page's own", which on the wire is null and not `""`.
                payload: { name: value.name.trim() || null, width: value.width, background: value.background || null },
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
