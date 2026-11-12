// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateReferralProvider } from "./affiliate-referral-provider"
import { StorefrontAffiliateBand } from "./storefront-affiliate-band"
import { StorefrontAffiliateNoteLive } from "./storefront-affiliate-note-live"
import type { AffiliateReferral } from "@/lib/affiliate-link"
import { useAffiliateReferralUi } from "@/stores/affiliate-referral"

const navigation = vi.hoisted(() => ({ pathname: "/lessari" }))
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }))

const ID = "0199a1b2-0000-7000-8000-000000000001"
const JOAO: AffiliateReferral = { affiliate: { id: ID, slug: "joao", name: "João Silva", photoUrl: null, tagline: "Meus favoritos", attributionDays: 30 }, hidden: false }

function shop(referral: AffiliateReferral | null, children = <StorefrontAffiliateBand messages={ptBR} />) {
  return render(
    <AffiliateReferralProvider slug="lessari" referral={referral}>
      {children}
    </AffiliateReferralProvider>,
  )
}

afterEach(() => {
  useAffiliateReferralUi.setState({ arrivedOn: {}, closed: {} })
  navigation.pathname = "/lessari"
  document.cookie = "bl_affiliate_hidden=; Path=/lessari; Max-Age=0"
})

describe("whom the visitor came by, under the shop's header (IMPULSEIA-105)", () => {
  it("draws the card, with the whole name and the phrase, on the page the link arrived at", () => {
    useAffiliateReferralUi.getState().arrive("lessari", "/lessari")
    shop(JOAO)

    expect(screen.getByRole("region", { name: "Indicação" })).toHaveTextContent("Você chegou pela indicação de João Silva")
    expect(screen.getByText("“Meus favoritos”")).toBeInTheDocument()
    // The card is a page's: it is not closed.
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("draws the strip on every other page, and closes it for the browser's session without forgetting the affiliate", async () => {
    useAffiliateReferralUi.getState().arrive("lessari", "/lessari")
    navigation.pathname = "/lessari/produtos"
    // The browser reads back only the cookies of the path it is on.
    window.history.replaceState(null, "", "/lessari/produtos")
    shop(JOAO)

    expect(screen.getByRole("region", { name: "Indicação" })).toHaveTextContent("Comprando pela indicação de João")
    await userEvent.click(screen.getByRole("button", { name: "Fechar indicação" }))

    expect(screen.queryByRole("region", { name: "Indicação" })).toBeNull()
    expect(document.cookie).toContain(`bl_affiliate_hidden=${ID}`)
  })

  it("draws no strip for a referral the browser already closed, and still the line on the order", () => {
    shop(
      { ...JOAO, hidden: true },
      <>
        <StorefrontAffiliateBand messages={ptBR} />
        <StorefrontAffiliateNoteLive messages={ptBR} />
      </>,
    )

    expect(screen.queryByRole("region", { name: "Indicação" })).toBeNull()
    expect(screen.getByText("Indicação de João")).toBeInTheDocument()
    expect(screen.getByText("João verá seu nome neste pedido.")).toBeInTheDocument()
  })

  it("draws nothing for a visitor who came by nobody, nor outside a shop", () => {
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
