// Next
import type { Metadata } from "next"

// UI
import { LegalDocument } from "@harness-monorepo/ui/blocks/legal/legal-document"

// App
import { getMessages } from "@/lib/locale"
import { legalTexts } from "@/locales/legal/pt-BR"

export async function generateMetadata(): Promise<Metadata> {
  const { web } = await getMessages()
  return { title: `${legalTexts.privacy.title} · ${web.metadata.title}` }
}

/** bee-link's privacy policy: who keeps which data, for what, and how its owner asks for it (BEELINK-171). */
export default function PrivacyPage() {
  return <LegalDocument content={legalTexts.privacy} />
}
