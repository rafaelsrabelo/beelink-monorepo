// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import type { ShopAddressDomain } from "@harness-monorepo/ui/lib/custom-domain"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomDomainSkeleton } from "./custom-domain-skeleton"
import { ADDRESS, HOST } from "./custom-domain.fixtures"
import { ShopAddressCard, type ShopAddressCardProps } from "./shop-address-card"

const HREF = "/admin/lessari/domain"

function show(domain: ShopAddressDomain | null, props: Partial<ShopAddressCardProps> = {}) {
  return render(
    <ul>
      <ShopAddressCard address={ADDRESS} domain={domain} href={HREF} {...props} />
    </ul>,
  )
}

describe("ShopAddressCard (BEELINK-285)", () => {
  it("says the address the page has and calls for a domain of its own, while there is none", async () => {
    const { container } = show(null)

    expect(screen.getByRole("heading", { level: 3, name: "Aponte para o seu domínio" })).toBeInTheDocument()
    expect(screen.getByText("O endereço da sua página hoje é beelink.biz/lessari. Se você já tem um domínio, como seudominio.com.br, ele pode ser o endereço.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Configurar domínio/ })).toHaveAttribute("href", HREF)
    expect(screen.queryByText("Feito")).toBeNull()
    expect(screen.queryByText("Aguardando")).toBeNull()
    await expectNoA11yViolations(container)
  })

  /** Saved and not active is neither left to do nor done: the address in force is still the platform's, and the card says both. */
  it("is waiting on a saved domain that is not active yet, naming it and the address still in force", async () => {
    const { container } = show({ host: HOST, status: "PENDING" })

    expect(screen.getByRole("heading", { level: 3, name: "Domínio próprio" })).toBeInTheDocument()
    expect(screen.getByText("Aguardando")).toBeInTheDocument()
    expect(screen.queryByText("Feito")).toBeNull()
    expect(screen.getByText("lessari.com.br ainda não abre a sua página: falta terminar a configuração. Até lá, o endereço segue sendo beelink.biz/lessari.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Ver o que falta/ })).toHaveAttribute("href", HREF)
    await expectNoA11yViolations(container)
  })

  it("is done once the domain is active, and says the domain as the page's address", async () => {
    const { container } = show({ host: HOST, status: "ACTIVE" })

    expect(screen.getByText("Feito")).toBeInTheDocument()
    expect(screen.queryByText("Aguardando")).toBeNull()
    expect(screen.getByText("O endereço da sua página é lessari.com.br.")).toBeInTheDocument()
    // The platform's address is no longer the page's: it is not said.
    expect(screen.queryByText(/beelink\.biz/)).toBeNull()
    expect(screen.getByRole("link", { name: /Gerenciar domínio/ })).toHaveAttribute("href", HREF)
    await expectNoA11yViolations(container)
  })

  /** The home's cards are a site's as much as a shop's, and "loja" reads wrong on a site. */
  it.each([["pt-BR", ptBR], ["en", en]] as const)("never says shop, in %s: the card is a site's as much", (_name, messages) => {
    const said = Object.values(messages.customDomain.home).flatMap((state) => Object.values(state)).join(" ")

    expect(said).not.toMatch(/\bloja\b|\bshop\b|\bstore\b/i)
  })

  it("sits in the home's grid as the screen says, and speaks the language it is handed", () => {
    show({ host: HOST, status: "PENDING" }, { className: "lg:col-span-2", messages: en })

    expect(screen.getByRole("listitem")).toHaveClass("lg:col-span-2")
    expect(screen.getByText("Waiting")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /See what is missing/ })).toBeInTheDocument()
  })
})

describe("CustomDomainSkeleton", () => {
  it("holds the screen's place with grey shapes, and is read out as nothing", () => {
    const { container } = render(<CustomDomainSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(4)
    expect(container).toHaveTextContent("")
  })
})
