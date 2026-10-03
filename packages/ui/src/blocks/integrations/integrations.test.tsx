// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { IntegrationsFailed } from "./integrations-failed"
import { IntegrationsResult } from "./integrations-result"
import { IntegrationsSkeleton } from "./integrations-skeleton"
import { connected, services, shipping } from "./integrations.fixtures"
import { MelhorEnvioCard } from "./melhor-envio-card"
import { ShippingSettingsForm } from "./shipping-settings-form"

const CONNECT = "/api/stores/lessari/integrations/melhor-envio/connect"

describe("MelhorEnvioCard", () => {
  it("offers to connect a shop that has not, as a plain link to the route that leaves for Melhor Envio", async () => {
    const { container } = render(<MelhorEnvioCard view={{ ...connected, status: "DISCONNECTED", account: null }} connectHref={CONNECT} onDisconnect={() => {}} />)

    const card = screen.getByRole("region", { name: "Melhor Envio" })
    expect(within(card).getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", CONNECT)
    expect(within(card).getByText("Não conectado")).toBeInTheDocument()
    expect(within(card).queryByRole("button", { name: "Desconectar" })).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("says whose account is connected, that it is the sandbox, and what the wallet holds", async () => {
    const { container } = render(<MelhorEnvioCard view={connected} connectHref={CONNECT} onDisconnect={() => {}} />)

    expect(screen.getByText("Conectado")).toBeInTheDocument()
    expect(screen.getByText("Sandbox")).toBeInTheDocument()
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Loja Lessarienvios@lessari.com.br")
    expect(screen.getByText("Saldo da carteira").nextElementSibling).toHaveTextContent("R$ 1.624,90")
    expect(screen.queryByRole("link")).toBeNull()
    await expectNoA11yViolations(container)
  })

  /** A wallet that could not be read is not an empty one: zero there would tell the shop it cannot buy labels. */
  it("says the balance could not be read, never a zero in its place, and holds its place while it is read", () => {
    const { rerender } = render(<MelhorEnvioCard view={{ ...connected, wallet: { state: "failed" } }} connectHref={CONNECT} onDisconnect={() => {}} />)
    expect(screen.getByText("Não foi possível ler o saldo agora.")).toBeInTheDocument()
    expect(screen.queryByText(/R\$/)).toBeNull()

    rerender(<MelhorEnvioCard view={{ ...connected, wallet: { state: "loading" } }} connectHref={CONNECT} onDisconnect={() => {}} />)
    expect(screen.getByText("Saldo da carteira").nextElementSibling).toHaveAttribute("aria-busy", "true")
  })

  it("warns when Melhor Envio stopped accepting the connection, and offers to connect again", () => {
    render(<MelhorEnvioCard view={{ ...connected, status: "NEEDS_RECONNECT" }} connectHref={CONNECT} onDisconnect={() => {}} />)

    expect(screen.getByRole("alert")).toHaveTextContent("parou de aceitar esta conexão")
    expect(screen.getByRole("link", { name: "Conectar de novo" })).toHaveAttribute("href", CONNECT)
    expect(screen.getByText("Precisa reconectar")).toBeInTheDocument()
  })

  it("asks before disconnecting, keeping the connection on the default answer", async () => {
    const onDisconnect = vi.fn()
    render(<MelhorEnvioCard view={connected} connectHref={CONNECT} onDisconnect={onDisconnect} />)

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    const dialog = screen.getByRole("alertdialog", { name: "Desconectar o Melhor Envio?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Manter conectado" }))
    expect(onDisconnect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Desconectar" }))
    expect(onDisconnect).toHaveBeenCalledOnce()
  })

  it("says this installation has no app, offering nothing to press, in the language it is handed", () => {
    render(<MelhorEnvioCard view={{ ...connected, available: false, status: "DISCONNECTED", account: null }} connectHref={CONNECT} onDisconnect={() => {}} messages={en} />)

    expect(screen.getByText("Melhor Envio is not set up on this installation yet.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByText("Sandbox")).toBeNull()
  })
})

describe("ShippingSettingsForm", () => {
  /** BEELINK-187: the shop sends the labels, and the carrier asks for its document. */
  it("edits the labels' sender, and says what is wrong with the document under it", async () => {
    const onChange = vi.fn()
    const { container } = render(<ShippingSettingsForm value={{ ...shipping, senderDocument: "" }} onChange={onChange} onSubmit={() => {}} services={services} issues={{ senderDocument: "Informe o CPF (11 dígitos) ou o CNPJ (14 dígitos)." }} />)

    const document = screen.getByLabelText("CPF ou CNPJ")
    expect(document).toHaveAccessibleDescription("Informe o CPF (11 dígitos) ou o CNPJ (14 dígitos).")
    await userEvent.type(document, "1")
    expect(onChange).toHaveBeenLastCalledWith({ ...shipping, senderDocument: "1" })
    expect(screen.getByLabelText("Inscrição estadual")).toHaveAccessibleDescription(/ISENTO/)
    await expectNoA11yViolations(container)
  })

  it("switches each service by carrier, and edits the days and the parcel, reporting the whole value", async () => {
    const onChange = vi.fn()
    const { container } = render(<ShippingSettingsForm value={shipping} onChange={onChange} onSubmit={() => {}} services={services} />)

    const jadlog = screen.getByRole("group", { name: "Jadlog" })
    expect(within(jadlog).getByRole("switch", { name: ".Package" })).toBeChecked()
    expect(within(jadlog).getByRole("switch", { name: ".Com" })).not.toBeChecked()

    await userEvent.click(within(jadlog).getByRole("switch", { name: ".Com" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...shipping, serviceIds: [1, 2, 3, 4] })
    await userEvent.click(within(screen.getByRole("group", { name: "Correios" })).getByRole("switch", { name: "SEDEX" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...shipping, serviceIds: [1, 3] })
    await userEvent.type(screen.getByLabelText("Dias para postar"), "2")
    expect(onChange).toHaveBeenLastCalledWith({ ...shipping, handlingDays: "12" })
    await userEvent.type(screen.getByLabelText("Peso (g)"), "0")
    expect(onChange).toHaveBeenLastCalledWith({ ...shipping, weight: "5000" })
    await expectNoA11yViolations(container)
  })

  it("says each refusal by its field, and the API's under the button", () => {
    render(
      <ShippingSettingsForm
        value={shipping}
        onChange={() => {}}
        onSubmit={() => {}}
        services={services}
        issues={{ handlingDays: "Informe de 0 a 30 dias.", package: "Preencha o peso e as três medidas, ou deixe os quatro vazios." }}
        error="Alguma escolha está fora do permitido. Confira os campos."
      />,
    )

    expect(screen.getByLabelText("Dias para postar")).toHaveAccessibleDescription("Informe de 0 a 30 dias.")
    expect(screen.getByLabelText("Peso (g)")).toHaveAccessibleDescription("Preencha o peso e as três medidas, ou deixe os quatro vazios.")
    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toContain("Alguma escolha está fora do permitido. Confira os campos.")
  })

  it("holds the services' place while they are read, and says when they could not be", () => {
    const { rerender } = render(<ShippingSettingsForm value={shipping} onChange={() => {}} onSubmit={() => {}} services="loading" />)
    expect(screen.queryByRole("switch")).toBeNull()

    rerender(<ShippingSettingsForm value={shipping} onChange={() => {}} onSubmit={() => {}} services="failed" />)
    expect(screen.getByText("Não foi possível ler a lista de serviços do Melhor Envio agora.")).toBeInTheDocument()
  })

  it("saves on submit, and says it saved", async () => {
    const onSubmit = vi.fn()
    render(<ShippingSettingsForm value={shipping} onChange={() => {}} onSubmit={onSubmit} services={services} saved />)

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.getByText("Escolhas salvas.")).toBeInTheDocument()
  })
})

describe("the page's other states", () => {
  it("says what came of a connection, as news or as an alert", async () => {
    const { container, rerender } = render(<IntegrationsResult tone="done" message="Melhor Envio conectado." />)
    expect(screen.getByRole("status")).toHaveTextContent("Melhor Envio conectado.")
    await expectNoA11yViolations(container)

    rerender(<IntegrationsResult tone="failed" message="O Melhor Envio não respondeu." />)
    expect(screen.getByRole("alert")).toHaveTextContent("O Melhor Envio não respondeu.")
  })

  it("offers to read again a page that failed, and hides its skeleton from readers", async () => {
    const onRetry = vi.fn()
    const { container } = render(
      <>
        <IntegrationsFailed onRetry={onRetry} />
        <IntegrationsSkeleton />
      </>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
    await expectNoA11yViolations(container)
  })
})
