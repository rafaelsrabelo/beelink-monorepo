// Libs
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

/** The API has Google set up, in every case below: whether the shop offers it is this section's to say. */
const asked = vi.hoisted(() => ({ signInOptionsAt: vi.fn(async () => ({ google: true })) }))
vi.mock("@/lib/storefront-data", () => ({ signInOptionsAt: asked.signInOptionsAt }))

// App
import { StorefrontSignInSection } from "./storefront-sign-in-section"
import { ptBR as web } from "@/locales/pt-BR"
import { storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionPlace } from "@/lib/storefront-section"

const WORDS = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }

async function drawn(ownDomain: boolean, query: Record<string, string> = {}) {
  const store = { slug: "loja", name: "Loja", routeWords: WORDS, ownDomain } as unknown as PublicStore & { ownDomain: boolean }
  const place = { store, signInMode: "entrar", messages: ptBR } as unknown as SectionPlace

  return render(await StorefrontSignInSection({ place, routes: storefrontRoutes(store), query, errors: web.errors }))
}

const google = () => screen.queryByRole("link", { name: ptBR.storefront.continueWithGoogle })

afterEach(() => {
  cleanup()
  asked.signInOptionsAt.mockReset()
  asked.signInOptionsAt.mockResolvedValue({ google: true })
})

describe("the shop's sign-in page, and Google", () => {
  it("offers Google on the platform's host, with where to return spelled under the shop's slug", async () => {
    await drawn(false, { voltar: "/loja/carrinho" })

    const href = google()?.getAttribute("href") ?? ""
    expect(href.startsWith("/api/storefront/loja/customer/google?")).toBe(true)
    expect(new URLSearchParams(href.split("?")[1]).get("voltar")).toBe("/loja/carrinho")
  })

  /**
   * BEELINK-284: the shop's own handler first, which holds the flow to this browser at this domain
   * before the platform's host begins it — and the addresses it carries are this host's, with no slug.
   */
  it("offers it at the shop's own domain through the shop's own handler", async () => {
    await drawn(true, { voltar: "/carrinho" })

    const href = google()?.getAttribute("href") ?? ""
    expect(href.startsWith("/loja/api/customer/google?")).toBe(true)
    const query = new URLSearchParams(href.split("?")[1])
    expect(query.get("voltar")).toBe("/carrinho")
    expect(query.get("retorno")).toBe("/entrar")
  })

  it("offers it nowhere when the API has no Google set up", async () => {
    asked.signInOptionsAt.mockResolvedValue({ google: false })

    await drawn(true)
    expect(google()).toBeNull()
    cleanup()
    await drawn(false)
    expect(google()).toBeNull()
  })

  it("posts to the shop's handler, which keeps its slug on every host, and returns to an address with none", async () => {
    const { container } = await drawn(true, { voltar: "/carrinho" })

    expect(container.querySelector("form")?.getAttribute("action")).toBe("/loja/api/customer/entrar")
    expect(container.querySelector<HTMLInputElement>('input[name="voltar"]')?.value).toBe("/carrinho")
    expect(container.querySelector<HTMLInputElement>('input[name="retorno"]')?.value).toBe("/entrar")
  })
})
