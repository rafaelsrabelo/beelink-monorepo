// Next
import type { Metadata } from "next"

// UI
import { LegalDocument } from "@harness-monorepo/ui/blocks/legal/legal-document"

// App
import { getMessages } from "@/lib/locale"
import { legalTexts } from "@/locales/legal/pt-BR"

export async function generateMetadata(): Promise<Metadata> {
  const { web } = await getMessages()
  return { title: `${legalTexts.terms.title} · ${web.metadata.title}` }
}

/** bee-link's terms of use, which every account is opened under (BEELINK-171). */
export default function TermsPage() {
  return <LegalDocument content={legalTexts.terms} />
}
