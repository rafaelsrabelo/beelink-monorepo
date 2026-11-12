// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateReferralProvider } from "./affiliate-referral-provider"
import { StorefrontAffiliateBand } from "./storefront-affiliate-band"
import { StorefrontAffiliateNoteLive } from "./storefront-affiliate-note-live"
import type { AffiliateReferral } from "@/lib/affiliate-link"

const ID = "0199a1b2-0000-7000-8000-000000000001"
const JOAO: AffiliateReferral = { affiliate: { id: ID, slug: "joao", name: "João Silva", photoUrl: null, tagline: "Meus favoritos", attributionDays: 30 } }

function shop(referral: AffiliateReferral | null) {
  return render(
    <AffiliateReferralProvider slug="lessari" referral={referral}>
      <StorefrontAffiliateBand messages={ptBR} />
      <StorefrontAffiliateNoteLive messages={ptBR} />
    </AffiliateReferralProvider>,
  )
}

describe("whom the visitor came by, under the shop's header (IMPULSEIA-105)", () => {
  it("draws the band on every page of a visit that came by the link, with nothing to close, and the line on the order", () => {
    shop(JOAO)

    const band = screen.getByRole("region", { name: "Indicação" })
    expect(band).toHaveTextContent("Você está na loja de")
    expect(band).toHaveTextContent("João Silva")
    expect(band).toHaveTextContent("Parceria oficial")
    expect(screen.getByText("“Meus favoritos”")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("Indicação de João")).toBeInTheDocument()
    expect(screen.getByText("João verá seu nome neste pedido.")).toBeInTheDocument()
  })

  it("draws nothing for a visit that came by no link — no band, no line on the order — nor outside a shop", () => {
    const { container, unmount } = shop(null)
    expect(container).toBeEmptyDOMElement()
    unmount()

    const outside = render(<StorefrontAffiliateBand messages={ptBR} />)
    expect(outside.container).toBeEmptyDOMElement()
  })
})
