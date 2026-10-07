// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import StoreFunnelPage from "./funnel/page"
import ReportsPage from "./page"

const mocks = vi.hoisted(() => ({ screen: vi.fn((_props: object) => null) }))

vi.mock("@/lib/locale", () => ({ getMessages: async () => ({ ui, locale: "pt-BR" }) }))
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }))
vi.mock("@/components/reports/store-funnel-screen", () => ({ StoreFunnelScreen: (props: object) => mocks.screen(props) }))

const at = (slug: string) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) })

describe("the panel's reports page (BEELINK-276)", () => {
  it("lists the two reports, each with a line and its own address — it no longer leads straight to one", async () => {
    render(await ReportsPage(at("loja")))

    expect(screen.getByRole("heading", { level: 1, name: "Relatórios" })).toBeInTheDocument()
    const items = within(screen.getByRole("list", { name: "Relatórios disponíveis" })).getAllByRole("listitem")
    expect(items.map((item) => [within(item).getByRole("link").textContent, within(item).getByRole("link").getAttribute("href"), item.querySelector("p")?.textContent])).toEqual([
      ["Vendas por origem", "/admin/loja/reports/origins", "Quanto a loja vendeu por campanha: de onde veio o cliente de cada pedido."],
      ["Funil da loja", "/admin/loja/reports/funnel", "Onde os clientes desistem: das visitas à compra, etapa por etapa."],
    ])
  })

  it("opens the funnel's screen for the shop of the address", async () => {
    render(await StoreFunnelPage(at("loja-do-pixel")))

    expect(mocks.screen).toHaveBeenCalledWith({ slug: "loja-do-pixel", locale: "pt-BR", messages: ui })
  })
})
