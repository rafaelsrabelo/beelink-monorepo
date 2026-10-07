// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { MetaConversionsView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { MetaConversionsCard, type MetaConversionsCardProps } from "./meta-conversions-card"

/** The shape of a token, and nobody's. */
const TOKEN = "EAABnobodys0token0000000000000000000000"
const HREF = "https://business.facebook.com/events_manager"
const none: MetaConversionsView = { available: true, token: "NONE", refusal: null }
const set: MetaConversionsView = { available: true, token: "SET", refusal: null }

function view(props: Partial<MetaConversionsCardProps> = {}) {
  const handlers = { onSaveToken: vi.fn(), onRemoveToken: vi.fn(), onTest: vi.fn(), onReplaceCancel: vi.fn() }
  const rendered = render(<MetaConversionsCard view={set} eventsManagerHref={HREF} {...handlers} {...props} />)
  return { ...handlers, ...rendered }
}

const card = () => screen.getByRole("region", { name: "Compras pelo servidor" })
const tokenField = () => screen.getByLabelText<HTMLInputElement>(/Token de acesso da API de Conversões|Novo token de acesso/)

describe("MetaConversionsCard", () => {
  it("offers a shop with no token the field, masked and empty, where to generate one — and no test", async () => {
    const { container } = view({ view: none })

    expect(within(card()).getByText("Sem token")).toBeInTheDocument()
    expect(tokenField()).toHaveAttribute("type", "password")
    expect(tokenField()).toHaveAttribute("autocomplete", "off")
    expect(tokenField()).toHaveValue("")
    expect(screen.getByText(/clique em “Gerar token de acesso”/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Gerenciador de Eventos/ })).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.queryByRole("button", { name: "Enviar evento de teste" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remover o token" })).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("hands a pasted token over once, trimmed, and writes it into no attribute of the page", async () => {
    const { onSaveToken, container } = view({ view: none })

    expect(screen.getByRole("button", { name: "Salvar token" })).toBeDisabled()
    await userEvent.click(tokenField())
    await userEvent.paste(`  ${TOKEN}\n`)
    await userEvent.click(screen.getByRole("button", { name: "Salvar token" }))

    expect(onSaveToken).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(container.innerHTML).not.toContain(TOKEN)
  })

  it("says what is plainly no token and sends nothing, until the field changes", async () => {
    const { onSaveToken } = view({ view: none })

    await userEvent.type(tokenField(), "isto não é um token{Enter}")

    expect(onSaveToken).not.toHaveBeenCalled()
    expect(screen.getByText(/Isso não parece um token de acesso/)).toBeInTheDocument()
    expect(tokenField()).toHaveFocus()
    await userEvent.type(tokenField(), "x")
    expect(screen.queryByText(/Isso não parece um token de acesso/)).toBeNull()
  })

  it("says a token is saved and never shows it: change it, remove it, or try it", async () => {
    const { container } = view()

    expect(within(card()).getByText("Token salvo")).toBeInTheDocument()
    expect(screen.getByText(/não é mostrado de novo/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Token de acesso/)).toBeNull()
    expect(screen.getByRole("button", { name: "Trocar o token" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remover o token" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enviar evento de teste" })).toBeDisabled()
    await expectNoA11yViolations(container)
  })

  it("opens an empty field to replace the token, keeps it through a refusal, and leaves it on cancel", async () => {
    const { onSaveToken, onReplaceCancel, rerender } = view()

    await userEvent.click(screen.getByRole("button", { name: "Trocar o token" }))
    expect(tokenField()).toHaveFocus()
    expect(tokenField()).toHaveValue("")
    await userEvent.paste(TOKEN)
    await userEvent.click(screen.getByRole("button", { name: "Salvar novo token" }))
    expect(onSaveToken).toHaveBeenCalledWith(TOKEN)

    rerender(<MetaConversionsCard view={set} eventsManagerHref={HREF} onSaveToken={onSaveToken} onRemoveToken={() => {}} onTest={() => {}} onReplaceCancel={onReplaceCancel} tokenError="Não foi possível salvar o token. Tente de novo." />)
    expect(screen.getByText("Não foi possível salvar o token. Tente de novo.")).toBeInTheDocument()
    expect(tokenField()).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onReplaceCancel).toHaveBeenCalledOnce()
    expect(screen.queryByLabelText(/token de acesso/i)).toBeNull()
  })

  it("removes the token only after asking, and keeping it is the default", async () => {
    const { onRemoveToken } = view()

    await userEvent.click(screen.getByRole("button", { name: "Remover o token" }))
    const dialog = screen.getByRole("alertdialog", { name: "Remover o token?" })
    expect(within(dialog).getByText(/O pixel segue valendo pelo navegador/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Manter" }))
    expect(onRemoveToken).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Remover o token" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remover" }))
    expect(onRemoveToken).toHaveBeenCalledOnce()
  })

  it.each([
    ["TOKEN_REJECTED", /O token foi recusado pela Meta/],
    ["PIXEL_NOT_FOUND", /A Meta não encontrou este pixel com este token/],
  ] as const)("says a token Meta refused needs attention (%s), and what stopped", async (refusal, sentence) => {
    const { container } = view({ view: { available: true, token: "REJECTED", refusal } })

    expect(within(card()).getByText("Precisa de atenção")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(sentence)
    expect(screen.queryByText(/não é mostrado de novo/)).toBeNull()
    expect(screen.getByRole("button", { name: "Trocar o token" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("offers no field where the deployment cannot keep a token, and says so", async () => {
    const { container } = view({ view: { available: false, token: "NONE", refusal: null } })

    expect(within(card()).getByText("Indisponível")).toBeInTheDocument()
    expect(screen.getByText(/não está disponível nesta instalação/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Token de acesso/)).toBeNull()
    expect(screen.queryByRole("button", { name: "Enviar evento de teste" })).toBeNull()
    await expectNoA11yViolations(container)
  })

  describe("the test event", () => {
    const code = () => screen.getByLabelText<HTMLInputElement>("Código de teste")
    const send = () => screen.getByRole("button", { name: "Enviar evento de teste" })

    it("hands the code over trimmed, and refuses one no code could be before sending anything", async () => {
      const { onTest } = view()

      await userEvent.type(code(), "TEST 123")
      await userEvent.click(send())
      expect(onTest).not.toHaveBeenCalled()
      expect(screen.getByText(/Isso não parece um código de teste/)).toBeInTheDocument()

      await userEvent.clear(code())
      await userEvent.type(code(), " TEST12345 {Enter}")
      expect(onTest).toHaveBeenCalledExactlyOnceWith("TEST12345")
    })

    it("says it is no purchase and carries nobody's data, and that Meta keeps test events", () => {
      view()

      expect(screen.getByText(/não é uma compra e não leva dados de ninguém/)).toBeInTheDocument()
      expect(screen.getByText(/A Meta não descarta eventos de teste/)).toBeInTheDocument()
    })

    it("locks while Meta is asked, then announces what Meta said — with Meta's own words beside a refusal", () => {
      const { rerender, onSaveToken, onRemoveToken, onTest } = view({ testing: true })
      expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled()
      expect(screen.getByRole("status")).toBeEmptyDOMElement()

      rerender(<MetaConversionsCard view={set} eventsManagerHref={HREF} onSaveToken={onSaveToken} onRemoveToken={onRemoveToken} onTest={onTest} testResult={{ tone: "error", message: "A Meta aceitou o token, mas recusou o evento.", detail: "Meta refused (400, code 100): Invalid parameter" }} />)

      expect(screen.getByRole("status")).toHaveTextContent("A Meta aceitou o token, mas recusou o evento.")
      expect(screen.getByRole("status")).toHaveTextContent("Resposta da Meta: Meta refused (400, code 100): Invalid parameter")
    })

    it("says why a test was not made at all", () => {
      view({ testError: "Muitas tentativas. Espere um minuto e tente de novo." })

      expect(screen.getByText("Muitas tentativas. Espere um minuto e tente de novo.")).toBeInTheDocument()
    })
  })

  it("speaks English when handed English", () => {
    view({ view: none, messages: en })

    expect(screen.getByRole("region", { name: "Purchases from the server" })).toBeInTheDocument()
    expect(screen.getByLabelText("Conversions API access token")).toBeInTheDocument()
  })
})
