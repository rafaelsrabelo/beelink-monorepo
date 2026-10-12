// React
import type { ReactNode } from "react"

// Next
import Image from "next/image"

// App
import { INTEGRATION_LOGOS } from "@/lib/integration-pages"

// Types
import type { LandingIntegrationValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface IntegrationMarkProps {
  /** A file under `public/brand/integrations/`, by the address it is served at. */
  src: string
  /** Read out: on the landing a mark is what names its brand at a glance. */
  alt: string
}

/** The side of the frame `LandingIntegrations` gives a mark, in CSS px: Next offers this width and its double. */
const SIZE = 56

/**
 * A third party's mark for the landing's "Integrações", filling the square the block frames it in.
 * A PNG is served as AVIF or WebP at the size it is drawn; an SVG is served as it is, since Next
 * leaves a `src` ending in `.svg` unoptimised on its own.
 */
export function IntegrationMark({ src, alt }: IntegrationMarkProps) {
  return <Image src={src} alt={alt} width={SIZE} height={SIZE} className="size-full object-cover" />
}

/**
 * The four marks as `LandingIntegrations` takes them. The files are the panel's own
 * (`INTEGRATION_LOGOS`): a mark replaced there is replaced here, and the two never show a brand
 * two ways. Meta's is the one the panel draws on its pixel's card.
 */
export function integrationMarksOf(items: UiMessages["landing"]["integrations"]["items"]): Record<LandingIntegrationValue, ReactNode> {
  return {
    asaas: <IntegrationMark src={INTEGRATION_LOGOS.ASAAS} alt={items.asaas.alt} />,
    melhorEnvio: <IntegrationMark src={INTEGRATION_LOGOS.MELHOR_ENVIO} alt={items.melhorEnvio.alt} />,
    googleAnalytics: <IntegrationMark src={INTEGRATION_LOGOS.GOOGLE_ANALYTICS} alt={items.googleAnalytics.alt} />,
    meta: <IntegrationMark src={INTEGRATION_LOGOS.META_PIXEL} alt={items.meta.alt} />,
  }
}
