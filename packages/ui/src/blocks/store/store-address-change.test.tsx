// Libs
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { StoreAddressAvailability } from "@harness-monorepo/ui/lib/store-address"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreAddressChange, type StoreAddressChangeProps } from "./store-address-change"
import { StoreAddressChangeSkeleton } from "./store-address-change-skeleton"

function show(props: Partial<StoreAddressChangeProps> = {}) {
  const handlers = { onValueChange: vi.fn(), onConfirm: vi.fn() }
  const element = (more: Partial<StoreAddressChangeProps> = {}) => (
    <StoreAddressChange currentAddress="beelink.biz/padaria-do-bairo" prefix="beelink.biz/" value="" preview="" availability={{ state: "idle" }} lockedUntil={null} customDomain={null} {...handlers} {...props} {...more} />
  )
  const result = render(element())
  return { ...result, ...handlers, again: (more: Partial<StoreAddressChangeProps>) => result.rerender(element(more)) }
}

const free: StoreAddressAvailability = { state: "available" }
const button = () => screen.getByRole("button", { name: "Trocar endereço" })

describe("StoreAddressChange (BEELINK-331)", () => {
  it("names the address the page has and what a change does, and hands over every key typed", async () => {
    const { container, onValueChange } = show()

    expect(screen.getByRole("heading", { level: 1, name: "Trocar endereço" })).toBeInTheDocument()
    expect(screen.getByText("O endereço da sua página é beelink.biz/padaria-do-bairo.")).toBeInTheDocument()
    expect(screen.getByText(/O link antigo continua funcionando e passa a levar para o novo/)).toBeInTheDocument()
    expect(screen.getByText(/Clientes com a conta aberta na loja precisam entrar de novo/)).toBeInTheDocument()
    expect(screen.getByText("Você só poderá trocar de novo daqui a 30 dias.")).toBeInTheDocument()
    expect(button()).toHaveAttribute("aria-disabled", "true")

    await userEvent.type(screen.getByLabelText("Novo endereço"), "ab")
    expect(onValueChange).toHaveBeenNthCalledWith(1, "a")
    await expectNoA11yViolations(container)
  })

  it("shows the address as it will be stored, says while it is asked about, and whether it is free", () => {
    const { again } = show({ value: "Padaria do Bairro", preview: "padaria-do-bairro", availability: { state: "checking" } })
    const status = screen.getByRole("status")

    expect(within(status).getByText("Vai ficar assim: beelink.biz/padaria-do-bairro")).toBeInTheDocument()
    expect(within(status).getByText("Conferindo se o endereço está livre")).toHaveClass("sr-only")

    again({ value: "Padaria do Bairro", preview: "padaria-do-bairro", availability: free })
    expect(within(status).getByText("Este endereço está livre.")).toBeInTheDocument()

    again({ value: "padaria", preview: "padaria", availability: { state: "unavailable", reason: "TAKEN" } })
    expect(within(status).getByText("Este endereço já está em uso. Escolha outro.")).toBeInTheDocument()
    expect(screen.getByLabelText("Novo endereço")).toHaveAttribute("aria-invalid", "true")
    expect(button()).toHaveAttribute("aria-disabled", "true")
  })

  it("asks before changing, and an Enter on the question keeps the address", async () => {
    const { onConfirm } = show({ value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: free })

    await userEvent.click(button())
    const dialog = screen.getByRole("alertdialog", { name: "Trocar o endereço para beelink.biz/padaria-do-bairro?" })
    expect(within(dialog).getByText(/beelink\.biz\/padaria-do-bairo passa a levar para o endereço novo/)).toBeInTheDocument()

    await userEvent.keyboard("{Enter}")
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("changes once the question is answered yes", async () => {
    const { onConfirm } = show({ value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: free })

    await userEvent.click(button())
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Trocar endereço" }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("says the page's own domain stays as it is, where it has one", () => {
    show({ customDomain: "padariadobairro.com.br" })

    expect(screen.getByText("Seu domínio próprio, padariadobairro.com.br, continua o mesmo.")).toBeInTheDocument()
  })

  it("holds the field and the button while the change is made, and hands the focus back with a refusal", () => {
    const { again } = show({ value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: free, pending: true })

    expect(screen.getByLabelText("Novo endereço")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Trocando…" })).toHaveAttribute("aria-disabled", "true")

    again({ value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: free, pending: false, error: "Este endereço já está em uso. Escolha outro." })
    expect(screen.getByText("Este endereço já está em uso. Escolha outro.")).toBeInTheDocument()
    expect(screen.getByLabelText("Novo endereço")).toHaveFocus()
    expect(screen.queryByText("Este endereço está livre.")).toBeNull()
  })

  it("within 30 days of the last change, says from when another is accepted and offers no field", async () => {
    const { container } = show({ lockedUntil: "16/11/2026" })

    expect(screen.getByText("O endereço foi trocado há menos de 30 dias. Você poderá trocar de novo a partir de 16/11/2026.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Novo endereço")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("speaks the reader's language", () => {
    show({ messages: en, value: "admin", preview: "admin", availability: { state: "unavailable", reason: "RESERVED" } })

    expect(screen.getByRole("heading", { name: "Change address" })).toBeInTheDocument()
    expect(screen.getByText("This address is reserved by the system. Pick another one.")).toBeInTheDocument()
    cleanup()
  })

  it("has a skeleton that hides itself from a reader", () => {
    const { container } = render(<StoreAddressChangeSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })
})
