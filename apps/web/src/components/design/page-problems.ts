// Types
import type { PageProblem, Section } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import type { DesignPublishProblem } from "@harness-monorepo/ui/blocks/design/design-publish-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { labelOf } from "./design-draft"

/**
 * Each problem named as the structure column names things: the block's label, and its band's. One
 * function for Publicar's dialog and for the line after a model is applied, so a problem is called
 * the same in both.
 */
export function namedProblems(problems: readonly PageProblem[], saved: readonly Section[], messages: UiMessages): DesignPublishProblem[] {
  return problems.map((problem) => {
    const index = saved.findIndex((section) => section.id === problem.sectionId)
    const component = saved[index]?.components.find((row) => row.id === problem.componentId)

    return {
      kind: problem.kind,
      blockName: component ? labelOf(component.kind, component.title, messages) : "—",
      bandName: bandLabelOf(saved[index]?.name, index + 1, messages),
    }
  })
}
