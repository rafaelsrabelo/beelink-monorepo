// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { IntegrationCatalog } from "./integration-catalog"
import { IntegrationList } from "./integration-list"
import { melhorEnvioOption, melhorEnvioRow } from "./integrations.fixtures"

describe("IntegrationList", () => {
  it("lists the shop's connections, each leading to its own page", async () => {
    const { container } = render(<IntegrationList rows={[melhorEnvioRow]} newHref="/admin/lessari/integrations/new" />)

    const row = screen.getByRole("listitem")
    expect(within(row).getByText("Melhor Envio")).toBeInTheDocument()
    expect(within(row).getByText("Conectado")).toBeInTheDocument()
    expect(within(row).getByText("Sandbox")).toBeInTheDocument()
    expect(within(row).getByText("Conta: Loja Lessari")).toBeInTheDocument()
    expect(within(row).getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/lessari/integrations/melhor-envio")
    await expectNoA11yViolations(container)
  })

  it("marks one the third party stopped accepting", () => {
    render(<IntegrationList rows={[{ ...melhorEnvioRow, status: "NEEDS_RECONNECT", sandbox: false }]} newHref="/nova" />)

    expect(screen.getByText("Precisa reconectar")).toBeInTheDocument()
    expect(screen.queryByText("Sandbox")).toBeNull()
  })

  it("says a shop has none, and leads to adding one", async () => {
    const { container } = render(<IntegrationList rows={[]} newHref="/admin/lessari/integrations/new" />)

    expect(screen.getByText("Nenhuma integração conectada.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nova integração" })).toHaveAttribute("href", "/admin/lessari/integrations/new")
    await expectNoA11yViolations(container)
  })

  it("holds its place as grey shapes while the connections are read", () => {
    const { container } = render(<IntegrationList rows="loading" newHref="/nova" />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByText("Nenhuma integração conectada.")).toBeNull()
  })

  it("speaks the language it is handed", () => {
    render(<IntegrationList rows={[melhorEnvioRow]} newHref="/new" messages={en} />)
    expect(screen.getByRole("link", { name: "Set up Melhor Envio" })).toBeInTheDocument()
  })
})

describe("IntegrationCatalog", () => {
  it("offers a third party to connect, through a plain link to its authorization", async () => {
    const { container } = render(<IntegrationCatalog options={[melhorEnvioOption]} />)

    expect(screen.getByRole("heading", { level: 2, name: "Melhor Envio" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", melhorEnvioOption.connectHref)
    await expectNoA11yViolations(container)
  })

  it("leads one already connected to its page instead of connecting it twice", () => {
    render(<IntegrationCatalog options={[{ ...melhorEnvioOption, state: "connected" }]} />)

    expect(screen.getByText("Já conectado")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Conectar Melhor Envio" })).toBeNull()
    expect(screen.getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", melhorEnvioOption.href)
  })

  it("says when this installation has nothing set up to connect to", () => {
    render(<IntegrationCatalog options={[{ ...melhorEnvioOption, state: "unavailable" }]} />)

    expect(screen.getByText("O Melhor Envio ainda não está configurado nesta instalação.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
