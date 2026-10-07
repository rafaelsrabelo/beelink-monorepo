// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { cardHeavyFunnel, emptyFunnel, sampleFunnel } from "./reports.fixtures"
import { ReportsIndex } from "./reports-index"
import { StoreFunnelEmpty } from "./store-funnel-empty"
import { StoreFunnelList } from "./store-funnel-list"
import { StoreFunnelNotes } from "./store-funnel-notes"
import { StoreFunnelRemarks } from "./store-funnel-remarks"
import { StoreFunnelSkeleton } from "./store-funnel-skeleton"

const CAPTION = "Funil da loja, de 07/09/2026 a 06/10/2026"
const stepsOf = () => within(screen.getByRole("list", { name: CAPTION })).getAllByRole("listitem")
const linesOf = (item: HTMLElement) => [...item.querySelectorAll("p")].map((line) => line.textContent)

describe("StoreFunnelList", () => {
  it("draws the five steps in order, each with its count, its rate over the step before, and what was lost", async () => {
    const { container } = render(<StoreFunnelList steps={sampleFunnel} caption={CAPTION} />)

    expect(stepsOf().map(linesOf)).toEqual([
      ["1. Visitas", "1.840", "Páginas da loja abertas"],
      ["2. Produto visto", "612", "Páginas de produto abertas", "33,3 a cada 100 visitas", "1.228 a menos que na etapa anterior"],
      ["3. Adição ao carrinho", "148", "Cliques em adicionar ao carrinho", "24,2 a cada 100 produtos vistos", "464 a menos que na etapa anterior"],
      ["4. Checkout iniciado", "96", "Chegadas ao carrinho com produto", "64,9 a cada 100 adições ao carrinho", "52 a menos que na etapa anterior"],
      ["5. Compra", "41", "Pedidos feitos no site que contam como venda", "42,7 a cada 100 checkouts iniciados", "55 a menos que na etapa anterior"],
    ])
    expect(screen.getByRole("list", { name: CAPTION }).tagName).toBe("OL")
    await expectNoA11yViolations(container)
  })

  it("draws a bar per step as decoration: hidden from a screen reader, sized against the largest step", () => {
    render(<StoreFunnelList steps={sampleFunnel} caption={CAPTION} />)

    const bars = screen.getAllByTestId("funnel-bar")
    expect(bars).toHaveLength(5)
    expect(bars.every((bar) => bar.getAttribute("aria-hidden") === "true")).toBe(true)
    expect(bars.map((bar) => (bar.firstElementChild as HTMLElement).style.width)).toEqual(["100%", "33.3%", "8%", "5.2%", "2.2%"])
    // A token's class, never a colour.
    expect(bars.map((bar) => bar.firstElementChild?.className).every((name) => name?.includes("bg-primary"))).toBe(true)
  })

  it("says a step larger than the one before as it is, with no drop, and no bar past its track", () => {
    render(<StoreFunnelList steps={cardHeavyFunnel} caption={CAPTION} />)

    expect(linesOf(stepsOf()[2]!)).toEqual(["3. Adição ao carrinho", "52", "Cliques em adicionar ao carrinho", "130 a cada 100 produtos vistos"])
    expect(linesOf(stepsOf()[4]!)).toEqual(["5. Compra", "0", "Pedidos feitos no site que contam como venda", "0 a cada 100 checkouts iniciados", "30 a menos que na etapa anterior"])
    expect(screen.getAllByTestId("funnel-bar").map((bar) => parseFloat((bar.firstElementChild as HTMLElement).style.width)).every((width) => width <= 100)).toBe(true)
  })

  it("says no rate over a step that counted nothing", () => {
    render(<StoreFunnelList steps={emptyFunnel} caption={CAPTION} />)

    expect(stepsOf().map((item) => linesOf(item).length)).toEqual([3, 3, 3, 3, 3])
  })

  it("speaks the language it is handed", () => {
    render(<StoreFunnelList steps={sampleFunnel} caption="Shop funnel" locale="en" messages={en} />)

    expect(linesOf(within(screen.getByRole("list", { name: "Shop funnel" })).getAllByRole("listitem")[1]!)).toEqual(["2. Product viewed", "612", "Product pages opened", "33.3 per 100 visits", "1,228 fewer than the step before"])
  })
})

describe("StoreFunnelSkeleton", () => {
  it("holds the five steps' places, with no spinner and nothing to read", () => {
    render(<StoreFunnelSkeleton />)

    const skeleton = screen.getByTestId("store-funnel-skeleton")
    expect(skeleton).toHaveAttribute("aria-hidden", "true")
    expect(skeleton.children).toHaveLength(5)
    expect(screen.queryByRole("status")).toBeNull()
    expect(skeleton).toHaveTextContent("")
  })
})

describe("StoreFunnelEmpty", () => {
  it("says nothing was counted, and that the shopkeeper's own visits do not count", async () => {
    const { container } = render(<StoreFunnelEmpty />)

    expect(screen.getByText("Nenhuma visita contada neste período.")).toBeInTheDocument()
    expect(screen.getByText(/As visitas feitas com o painel aberto neste navegador não contam\./)).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<StoreFunnelEmpty messages={en} />)

    expect(screen.getByText("No visits counted in this period.")).toBeInTheDocument()
  })
})

describe("StoreFunnelRemarks", () => {
  it("says when the count began and how many panel sales stayed out", () => {
    render(<StoreFunnelRemarks panelSales={3} countingSince="06/10/2026" />)

    expect(screen.getByText("A contagem desta loja começou em 06/10/2026. Os dias anteriores não têm visitas contadas, e as compras deles não entram no funil.")).toBeInTheDocument()
    expect(screen.getByText("3 vendas registradas no painel nestes dias ficaram fora do funil: não passaram pelo site.")).toBeInTheDocument()
  })

  it("says one sale as one", () => {
    render(<StoreFunnelRemarks panelSales={1} countingSince={null} />)

    expect(screen.getByText("1 venda registrada no painel nestes dias ficou fora do funil: não passou pelo site.")).toBeInTheDocument()
    expect(screen.queryByText(/A contagem desta loja/)).toBeNull()
  })

  it("draws nothing with nothing to remark", () => {
    const { container } = render(<StoreFunnelRemarks panelSales={0} countingSince={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("speaks the language it is handed", () => {
    render(<StoreFunnelRemarks panelSales={1200} countingSince="10/06/2026" locale="en" messages={en} />)

    expect(screen.getByText(/^1,200 sales registered in the panel/)).toBeInTheDocument()
    expect(screen.getByText(/began on 10\/06\/2026/)).toBeInTheDocument()
  })
})

describe("StoreFunnelNotes", () => {
  it("says the steps count events, the purchases are real orders, nothing identifies a visitor, and for how long a day is kept", async () => {
    const { container } = render(<StoreFunnelNotes retentionMonths={13} />)

    const notes = within(screen.getByRole("region", { name: "Bom saber" })).getAllByRole("listitem").map((note) => note.textContent)
    expect(notes).toEqual([
      "As etapas contam eventos, não pessoas: quem abre cinco produtos conta cinco vezes. Por isso as taxas são “a cada 100”, e não a porcentagem dos visitantes que compraram.",
      "Uma etapa pode ser maior que a anterior: dá para adicionar ao carrinho direto da vitrine, sem abrir o produto.",
      "As compras são os pedidos de verdade da loja, feitos pelo cliente no site, pela mesma regra de “Vendas por origem”: o pedido não cancelado, e o cobrado no site só depois de pago.",
      "Nada aqui identifica quem visitou. A loja guarda só um número por dia e por etapa, sem cookie e sem dado do visitante — por isso conta também de quem recusa os cookies e em loja sem pixel.",
      "Com o painel aberto neste navegador, as suas próprias visitas à loja não contam.",
      "A contagem começou quando o funil foi lançado: os dias anteriores aparecem zerados.",
      "Os números de cada dia ficam guardados por 13 meses e depois são apagados.",
    ])
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<StoreFunnelNotes retentionMonths={13} messages={en} />)

    expect(within(screen.getByRole("region", { name: "Good to know" })).getAllByRole("listitem").at(-1)).toHaveTextContent("Each day's numbers are kept for 13 months and then deleted.")
  })
})

describe("ReportsIndex", () => {
  const reports = [
    { title: "Vendas por origem", text: "Quanto a loja vendeu por campanha.", href: "/admin/loja/reports/origins" },
    { title: "Funil da loja", text: "Onde os clientes desistem.", href: "/admin/loja/reports/funnel" },
  ]

  it("lists each report with its line and the way in", async () => {
    const { container } = render(<ReportsIndex reports={reports} />)

    const items = within(screen.getByRole("list", { name: "Relatórios disponíveis" })).getAllByRole("listitem")
    expect(items.map((item) => [within(item).getByRole("heading", { level: 2 }).textContent, within(item).getByRole("link").getAttribute("href"), item.querySelector("p")?.textContent])).toEqual([
      ["Vendas por origem", "/admin/loja/reports/origins", "Quanto a loja vendeu por campanha."],
      ["Funil da loja", "/admin/loja/reports/funnel", "Onde os clientes desistem."],
    ])
    expect(screen.getByRole("link", { name: "Funil da loja" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("navigates through the link component it is handed", () => {
    render(<ReportsIndex reports={reports} linkComponent={({ href, children, ...rest }) => <a data-router="app" href={String(href)} {...rest}>{children}</a>} messages={en} />)

    expect(screen.getAllByRole("link").every((link) => link.getAttribute("data-router") === "app")).toBe(true)
    expect(screen.getByRole("list", { name: "Available reports" })).toBeInTheDocument()
  })
})
