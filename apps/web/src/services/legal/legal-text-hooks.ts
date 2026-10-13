"use client"

// Libs
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"

// Types
import type { LegalDocumentContent } from "@harness-monorepo/ui/blocks/legal/legal-document"

/** Bee-link's two legal texts, by the names `legalTexts` keeps them under. */
export type LegalTextName = "terms" | "privacy"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const legalKeys = {
  all: ["legal"] as const,
  text: (name: LegalTextName) => [...legalKeys.all, name] as const,
}

/**
 * One of bee-link's legal texts, fetched when it is asked for and not before (BEELINK-322): the
 * landing reads the two in a dialog over its courier form, and their words must not travel with the
 * page — not in its HTML, and not in the script it starts with.
 *
 * The text is the very module the two pages draw (`locales/legal`), reached by an `import()`: the
 * bundler keeps it in a file of its own, which the browser asks for when this hook is first enabled.
 * Nothing here imports that module the ordinary way, and nothing a browser loads may — an `import`
 * at the top of any client file would carry the text back into the page's script.
 *
 * It never goes stale: the text changes with a deploy, and a new deploy is a new page.
 */
export function useLegalText(name: LegalTextName, enabled: boolean): UseQueryResult<LegalDocumentContent, Error> {
  return useQuery({
    queryKey: legalKeys.text(name),
    queryFn: async (): Promise<LegalDocumentContent> => (await import("@/locales/legal/pt-BR")).legalTexts[name],
    enabled,
    staleTime: Infinity,
    // Once more by itself, and then the dialog says so and offers the way to the page.
    retry: 1,
  })
}
