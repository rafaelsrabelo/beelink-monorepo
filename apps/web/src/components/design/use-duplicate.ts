"use client"

// React
import { useRef, useState } from "react"

// Types
import type { Section } from "@harness-monorepo/contracts"

// UI
import { SELECTION_BAR_SHORTCUTS } from "@harness-monorepo/ui/blocks/design/design-selection-bar"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { useDuplicateComponent, useDuplicateSection } from "@/services/page/page-hooks"
import { useDesignEdit } from "@/stores/design-edit"
import { withBandCopy, withBlockCopy } from "./design-draft-copy"
import { focusBar, focusNode, regionOf } from "./design-focus"
import type { DesignSelection, SelectionTarget } from "./design-selection"
import { hasUnsaved } from "./live-edit"
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

export interface DuplicateInput {
  slug: string
  saved: readonly Section[]
  target: SelectionTarget | null
  draft: Pick<ReturnType<typeof useDesignDraft>, "edit">
  choose: (next: DesignSelection, options?: { openDrawer?: boolean; takeFocus?: boolean }) => void
  factsOf: (of: SelectionTarget) => { name: string; copiable: boolean } | null
  say: (sentence: string) => void
  messages: UiMessages
  web: WebMessages
}

/**
 * Duplicar, from the bar or Ctrl/⌘+D: a hidden copy on the server, right after the original, shown
 * in the draft as the original is held there and chosen.
 *
 * One press is one copy — a second press while one is on its way, or a held chord's repeats, would
 * each leave a hidden copy Descartar does not take back. A refusal is said aloud and shown under the
 * bar of the section it was for.
 */
export function useDuplicate({ slug, saved, target, draft, choose, factsOf, say, messages, web }: DuplicateInput) {
  const text = messages.design.bar
  const copyBand = useDuplicateSection(slug)
  const copyBlock = useDuplicateComponent(slug)
  // Set in the event that starts a copy: render state would let a second press in that frame through.
  const copying = useRef(false)
  const [refusal, setRefusal] = useState<{ key: string; sentence: string } | null>(null)

  const duplicate = (of: SelectionTarget) => {
    const facts = factsOf(of)
    if (!facts?.copiable || copying.current) return
    // The copy is made from what is saved and then chosen: what the open panel holds would be thrown
    // away, and the copy would not be what the preview shows. The same refusal as ↑↓.
    const open = target ? factsOf(target) : null
    if (open && hasUnsaved(useDesignEdit.getState().edit, saved)) return say(format(text.unsaved, { name: open.name }))

    setRefusal(null)
    copying.current = true
    // The focus follows to the copy, in the part of the editor the owner pressed in.
    const region = document.activeElement ? regionOf(document.activeElement) : null
    const done = (key: string) => {
      say(format(text.duplicated, { name: facts.name }))
      focusNode(region, key)
    }
    const refused = (error: unknown) => {
      const sentence = pageErrorCopy(error, web) ?? ""
      say(sentence)
      setRefusal({ key: of.id, sentence })
      focusBar(of.id, SELECTION_BAR_SHORTCUTS.duplicate)
    }
    const settled = () => {
      copying.current = false
    }

    if (of.level === "block") {
      copyBlock.mutate(of.id, {
        onSuccess: (copy) => {
          draft.edit((current) => withBlockCopy(current, copy, of.id))
          choose({ level: "block", id: copy.id }, { openDrawer: false, takeFocus: false })
          done(copy.id)
        },
        onError: refused,
        onSettled: settled,
      })
      return
    }

    copyBand.mutate(of.id, {
      onSuccess: (copy) => {
        draft.edit((current) => withBandCopy(current, saved, copy, of.id))
        const twin = of.blockId ? copy.components[0] : undefined
        choose(twin ? { level: "block", id: twin.id } : { level: "band", id: copy.id }, { openDrawer: false, takeFocus: false })
        done(copy.id)
      },
      onError: refused,
      onSettled: settled,
    })
  }

  return {
    duplicate,
    duplicating: copyBand.isPending || copyBlock.isPending,
    /** The refusal to show under a section's bar, if its last copy was refused. */
    refusalFor: (key: string) => (refusal?.key === key ? refusal.sentence : null),
  }
}
