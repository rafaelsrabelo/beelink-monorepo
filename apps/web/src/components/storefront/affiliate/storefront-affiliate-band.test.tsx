// Libs
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateReferralProvider } from "./affiliate-referral-provider"
import { StorefrontAffiliateBand } from "./storefront-affiliate-band"
import { StorefrontAffiliateNoteLive } from "./storefront-affiliate-note-live"
import type { AffiliateReferral } from "@/lib/affiliate-link"

const navigation = vi.hoisted(() => ({ search: "" }))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.search) }))

const ID = "0199a1b2-0000-7000-8000-000000000001"
const JOAO: AffiliateReferral = { affiliate: { id: ID, slug: "joao", name: "João Silva", photoUrl: null, tagline: "Meus favoritos", attributionDays: 30 } }

function shop(referral: AffiliateReferral | null, children = <StorefrontAffiliateBand messages={ptBR} />) {
  return render(
    <AffiliateReferralProvider slug="lessari" referral={referral}>
      {children}
    </AffiliateReferralProvider>,
  )
}

afterEach(() => {
  navigation.search = ""
})

describe("whom the visitor came by, under the shop's header (IMPULSEIA-105)", () => {
  it("draws the band, with the whole name and the phrase and nothing to close, where `?afiliado=` names the affiliate credited", () => {
    navigation.search = "?afiliado=JOAO&utm_source=instagram"
    shop(JOAO)

    const band = screen.getByRole("region", { name: "Indicação" })
    expect(band).toHaveTextContent("Você está na loja de")
    expect(band).toHaveTextContent("João Silva")
    expect(band).toHaveTextContent("Parceria oficial")
    expect(screen.getByText("“Meus favoritos”")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("draws it at the link's own address, `/<shop>/<name>`, which carries no `?afiliado=`", () => {
    shop(JOAO, <StorefrontAffiliateBand arrivedBy="joao" messages={ptBR} />)

    expect(screen.getByRole("region", { name: "Indicação" })).toHaveTextContent("João Silva")
  })

  it("draws no band on a visit straight to the shop while the referral holds — and still the line on the order", () => {
    shop(
      JOAO,
      <>
        <StorefrontAffiliateBand messages={ptBR} />
        <StorefrontAffiliateNoteLive messages={ptBR} />
      </>,
    )

    expect(screen.queryByRole("region", { name: "Indicação" })).toBeNull()
    expect(screen.getByText("Indicação de João")).toBeInTheDocument()
    expect(screen.getByText("João verá seu nome neste pedido.")).toBeInTheDocument()
  })

  it("draws no band where the link names someone the shop does not credit", () => {
    navigation.search = "?afiliado=maria"
    const { container, unmount } = shop(JOAO)
    expect(container).toBeEmptyDOMElement()
    unmount()

    shop(JOAO, <StorefrontAffiliateBand arrivedBy="maria" messages={ptBR} />)
    expect(screen.queryByRole("region", { name: "Indicação" })).toBeNull()
  })

  it("draws nothing for a visitor who came by nobody, nor outside a shop", () => {
    navigation.search = "?afiliado=joao"
    const { container, unmount } = shop(null, (
      <>
        <StorefrontAffiliateBand messages={ptBR} />
        <StorefrontAffiliateNoteLive messages={ptBR} />
      </>
    ))
    expect(container).toBeEmptyDOMElement()
    unmount()

    const outside = render(<StorefrontAffiliateBand messages={ptBR} />)
    expect(outside.container).toBeEmptyDOMElement()
  })
})
