// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicComponent, PublicSection, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { anchorOf, ctaOf, menuOf, siteFooterColumnsOf } from "./site-chrome"

function component(kind: PublicComponent["kind"]): PublicComponent {
  return { id: `${kind}-c`, kind, title: null, subtitle: null, body: null, layout: "FULL", items: [], columns: null, align: null }
}

function band(id: string, name: string | null, kind: PublicComponent["kind"] = "HEADING"): PublicSection {
  return { id, name, width: "CONTAINED", background: null, components: [component(kind)] }
}

const sections = [
  band("strip", "Aviso", "ANNOUNCEMENT"),
  band("a", "Serviços"),
  band("b", null),
  band("c", "Como funciona"),
  band("d", "Pedir orçamento", "CONTACT"),
]

describe("site chrome", () => {
  it("builds an anchor a person can read from the band's name", () => {
    expect(anchorOf(band("x", "Como funciona"))).toBe("como-funciona")
    expect(anchorOf(band("x", "Serviços"))).toBe("servicos")
  })

  /** The button is the contact band, by its own name — no column says so. */
  it("makes the first named band with a form the header's button", () => {
    expect(ctaOf(sections)).toEqual({ label: "Pedir orçamento", href: "#pedir-orcamento" })
  })

  it("keeps the button's band out of the menu, and unnamed bands and the strip too", () => {
    expect(menuOf(sections).map((entry) => entry.label)).toEqual(["Serviços", "Como funciona"])
  })

  it("has no button when no named band holds a form", () => {
    expect(ctaOf([band("a", "Serviços"), band("d", null, "CONTACT")])).toBeNull()
  })

  /** The header hides its menu on a phone; the footer is where every name is found, the button's too. */
  it("lists every named band in the footer", () => {
    const store = { socialNetworks: { whatsapp: null } } as unknown as PublicStore
    const [navigation] = siteFooterColumnsOf(store, sections, ptBR)

    expect(navigation?.items.map((item) => item.label)).toEqual(["Serviços", "Como funciona", "Pedir orçamento"])
  })
})
