// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DeliveryBandRows } from "./delivery-band-rows"
import { DeliveryCarriers } from "./delivery-carriers"
import { DeliverySettingsFailed } from "./delivery-settings-failed"
import { DeliverySettingsForm, type DeliverySettingsFormProps } from "./delivery-settings-form"
import { DeliverySettingsSkeleton } from "./delivery-settings-skeleton"
import { sampleConnectedCarriers, sampleDeliveryPreviews, sampleDeliveryValues } from "./delivery.fixtures"

const CONNECT = "/api/stores/lessari/integrations/melhor-envio/connect"
const MANAGE = "/admin/lessari/integrations"

function renderForm(overrides: Partial<DeliverySettingsFormProps> = {}) {
  const onChange = vi.fn()
  const onSubmit = vi.fn()
  const view = render(
    <DeliverySettingsForm
      value={sampleDeliveryValues}
      onChange={onChange}
      onSubmit={onSubmit}
      previews={sampleDeliveryPreviews}
      pickupAddress="Rua Augusta, 1500 — São Paulo/SP"
      map={null}
      carriers={sampleConnectedCarriers}
      connectHref={CONNECT}
      manageHref={MANAGE}
      {...overrides}
    />,
  )
  return { ...view, onChange, onSubmit }
}

describe("DeliverySettingsForm", () => {
  it("shows the three ways out, each a card named by its title with its own switch", async () => {
    const { container } = renderForm()

    for (const name of ["Retirada na loja", "Entrega própria", "Transportadoras (Melhor Envio)"]) {
      const card = screen.getByRole("region", { name })
      expect(within(card).getByRole("switch", { name })).toBeChecked()
    }
    expect(screen.getByText("Endereço de retirada: Rua Augusta, 1500 — São Paulo/SP")).toBeInTheDocument()
    expect(screen.getByText("Até 3 km: R$ 5,00, chega em 30–50 min.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("hands back the whole tab with a mode switched off", async () => {
    const { onChange } = renderForm()

    await userEvent.click(screen.getByRole("switch", { name: "Retirada na loja" }))

    expect(onChange).toHaveBeenCalledWith({ ...sampleDeliveryValues, pickupEnabled: false })
  })

  it("shows nothing inside a mode switched off but its switch", () => {
    renderForm({ value: { ...sampleDeliveryValues, ownDeliveryEnabled: false } })

    const card = screen.getByRole("region", { name: "Entrega própria" })
    expect(within(card).queryByRole("group", { name: "Faixas de distância" })).toBeNull()
    expect(within(card).getByRole("switch", { name: "Entrega própria" })).not.toBeChecked()
  })

  it("says the fee is agreed afterwards while there is no band, and asks for the address before a map", () => {
    renderForm({ value: { ...sampleDeliveryValues, bands: [] }, previews: [], map: { tileUrl: "https://tiles.test/{z}/{x}/{y}.png", point: null, radiusMeters: null } })

    expect(screen.getByText("Sem faixas, o frete é combinado com o cliente depois do pedido.")).toBeInTheDocument()
    expect(screen.getByText(/Complete o endereço da loja na aba Endereço para ver o raio/)).toBeInTheDocument()
  })

  it("says a refusal on its row and on its field", async () => {
    const { container } = renderForm({ previews: [], issues: { bands: { 1: "Faixa 2: a distância tem que ser maior que a da faixa 1." }, freeAbove: "Informe um valor maior que zero, ou deixe vazio." } })

    expect(screen.getByText("Faixa 2: a distância tem que ser maior que a da faixa 1.")).toBeInTheDocument()
    expect(screen.getByLabelText("Frete grátis acima de (R$)")).toHaveAttribute("aria-invalid", "true")
    await expectNoA11yViolations(container)
  })

  it("keeps the carriers switch still where this installation has no Melhor Envio", () => {
    renderForm({ carriers: { available: false, status: "DISCONNECTED", accountName: null, sandbox: false } })

    const toggle = screen.getByRole("switch", { name: "Transportadoras (Melhor Envio)" })
    expect(toggle).not.toBeChecked()
    expect(toggle).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText("O Melhor Envio ainda não está disponível nesta instalação.")).toBeInTheDocument()
  })

  it("saves the tab, and says what came of it", async () => {
    const { onSubmit, rerender } = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Salvar entrega" }))
    expect(onSubmit).toHaveBeenCalledOnce()

    rerender(<DeliverySettingsForm value={sampleDeliveryValues} onChange={() => {}} onSubmit={onSubmit} pickupAddress={null} map={null} carriers={sampleConnectedCarriers} connectHref={CONNECT} manageHref={MANAGE} saved />)
    expect(screen.getByText("Entrega salva.")).toBeInTheDocument()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderForm({ messages: en })

    expect(screen.getByRole("region", { name: "Own delivery" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save delivery" })).toBeInTheDocument()
  })
})

describe("DeliveryBandRows", () => {
  it("adds an empty band, removes one by its number, and stops at ten", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<DeliveryBandRows rows={sampleDeliveryValues.bands} onChange={onChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Adicionar faixa" }))
    expect(onChange).toHaveBeenLastCalledWith([...sampleDeliveryValues.bands, { upToKm: "", fee: "", windowFrom: "", windowTo: "" }])

    await userEvent.click(screen.getByRole("button", { name: "Remover a faixa 1" }))
    expect(onChange).toHaveBeenLastCalledWith([sampleDeliveryValues.bands[1]])

    rerender(<DeliveryBandRows rows={Array.from({ length: 10 }, () => sampleDeliveryValues.bands[0]!)} onChange={onChange} />)
    expect(screen.getByRole("button", { name: "Adicionar faixa" })).toBeDisabled()
  })

  it("hands back what was typed in a row", async () => {
    const onChange = vi.fn()
    render(<DeliveryBandRows rows={[{ upToKm: "", fee: "", windowFrom: "", windowTo: "" }]} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText("Até (km)"), "5")

    expect(onChange).toHaveBeenLastCalledWith([{ upToKm: "5", fee: "", windowFrom: "", windowTo: "" }])
  })
})

describe("DeliveryCarriers", () => {
  it("offers to connect as a plain link to the route that leaves for Melhor Envio", async () => {
    const { container } = render(<DeliveryCarriers view={{ ...sampleConnectedCarriers, status: "DISCONNECTED", accountName: null }} connectHref={CONNECT} manageHref={MANAGE} />)

    expect(screen.getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", CONNECT)
    await expectNoA11yViolations(container)
  })

  it("says whose account is connected, that it is the sandbox, and leads to the services in Integrations", () => {
    render(<DeliveryCarriers view={sampleConnectedCarriers} connectHref={CONNECT} manageHref={MANAGE} />)

    expect(screen.getByText(/Conectado à conta Doces da Ana/)).toBeInTheDocument()
    expect(screen.getByText("Sandbox: as etiquetas são de teste.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Escolher serviços e embalagem padrão" })).toHaveAttribute("href", MANAGE)
  })

  it("warns when Melhor Envio stopped accepting the connection, and offers to connect again", () => {
    render(<DeliveryCarriers view={{ ...sampleConnectedCarriers, status: "NEEDS_RECONNECT" }} connectHref={CONNECT} manageHref={MANAGE} />)

    expect(screen.getByRole("alert")).toHaveTextContent("parou de aceitar a conexão")
    expect(screen.getByRole("link", { name: "Conectar de novo" })).toHaveAttribute("href", CONNECT)
  })
})

describe("DeliverySettingsSkeleton", () => {
  it("says what is loading, and nothing else to a screen reader", async () => {
    const { container } = render(<DeliverySettingsSkeleton />)

    expect(screen.getByRole("status")).toHaveTextContent("Carregando as regras de entrega")
    await expectNoA11yViolations(container)
  })
})

describe("DeliverySettingsFailed", () => {
  it("says the rules could not be read, and asks again", async () => {
    const onRetry = vi.fn()
    const { container } = render(<DeliverySettingsFailed onRetry={onRetry} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as regras de entrega.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })
})
