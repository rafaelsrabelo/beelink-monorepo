// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { popupPicture } from "../storefront/popup.fixtures"
import { PopupForm, type PopupFormProps } from "./popup-form"
import { PopupPreview, type PopupPreviewProps } from "./popup-preview"
import { popupAnnouncing, popupAnnouncingNothing, popupChoices, popupDefaults, popupPlainWords, popupValues, popupWords } from "./popup.fixtures"

function form(props: Partial<PopupFormProps> = {}) {
  const onChange = vi.fn<(value: PopupFormValues) => void>()
  const onSubmit = vi.fn()
  const view = render(<PopupForm value={popupValues} onChange={onChange} onSubmit={onSubmit} choices={popupChoices} defaults={popupDefaults} {...props} />)
  return { ...view, onChange, onSubmit }
}

const preview = (props: Partial<PopupPreviewProps> = {}) => render(<PopupPreview words={popupWords} imageUrl={null} announcing={popupAnnouncing} {...props} />)

describe("PopupForm", () => {
  it("offers the switch, the three sentences, what is announced and when it opens", () => {
    form()

    expect(screen.getByRole("form", { name: "Pop-up de primeira compra" })).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "Mostrar o pop-up na loja" })).not.toBeChecked()
    expect(screen.getByLabelText("Título")).toHaveValue("")
    expect(screen.getByLabelText("Texto")).toHaveValue("")
    expect(screen.getByLabelText("Texto do botão")).toHaveValue("")
    expect(screen.getByRole("combobox", { name: "Benefício anunciado" })).toHaveTextContent("Seguir o destaque de primeira compra da loja")
    expect(screen.getByRole("button", { name: "Ao chegar" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByLabelText("Segundos depois de chegar")).toHaveValue("5")
  })

  it("shows the sentence a visitor would read where a field is left blank", () => {
    form()

    expect(screen.getByLabelText("Título")).toHaveAttribute("placeholder", "Ganhe 5% de desconto na primeira compra")
    expect(screen.getByLabelText("Texto do botão")).toHaveAttribute("placeholder", "Ganhar cupom")
  })

  it("says how to name the discount, and that a number typed by hand is not taken", () => {
    form()

    expect(screen.getByText(/escreva \{beneficio\}: o número vem do cupom ou da promoção e nunca fica errado/)).toBeInTheDocument()
    expect(screen.getByText(/Um desconto digitado à mão \(“10%”, “R\$ 15”\) não é aceito/)).toBeInTheDocument()
  })

  it("states the picture's proportion and a real size", () => {
    form()

    expect(screen.getByText(/Retrato, na proporção 4:5/)).toBeInTheDocument()
    expect(screen.getByText("Dimensão recomendada: 800 x 1000 pixels.")).toBeInTheDocument()
  })

  it("hands every change up as the whole form", async () => {
    const { onChange } = form()

    await userEvent.click(screen.getByRole("switch", { name: "Mostrar o pop-up na loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...popupValues, enabled: true })

    await userEvent.type(screen.getByLabelText("Título"), "E")
    expect(onChange).toHaveBeenLastCalledWith({ ...popupValues, title: "E" })

    await userEvent.click(screen.getByRole("button", { name: "Ao sair" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...popupValues, trigger: "ON_LEAVE" })
  })

  it("counts each sentence's room in characters, and marks one past it without cutting it", () => {
    form({ value: { ...popupValues, title: "a".repeat(81), buttonLabel: "Quero" } })

    const title = screen.getByLabelText("Título")
    expect(title).toHaveValue("a".repeat(81))
    expect(title).toHaveAttribute("aria-invalid", "true")
    expect(title).toHaveAccessibleDescription("81 de 80")
    expect(screen.getByLabelText("Texto do botão")).toHaveAccessibleDescription("5 de 30")
    expect(screen.getByLabelText("Texto do botão")).not.toHaveAttribute("aria-invalid")
  })

  it("says, on leaving, what a phone does instead — and asks for no delay", () => {
    form({ value: { ...popupValues, trigger: "ON_LEAVE" } })

    expect(screen.getByText(/No celular não há como perceber a saída: abre quando a pessoa rola metade da página ou depois de 30 segundos/)).toBeInTheDocument()
    expect(screen.queryByLabelText("Segundos depois de chegar")).toBeNull()
  })

  it("says where it shows and that it waits for the cookie notice", () => {
    form()

    expect(screen.getByText(/Nunca no carrinho, no cadastro ou na conta, e espera enquanto o aviso de cookies não foi respondido/)).toBeInTheDocument()
  })

  it("names each refusal under its field", () => {
    form({ issues: { title: "Não escreva o desconto à mão.", delay: "Informe um número inteiro de 0 a 60." } })

    expect(screen.getByLabelText("Título")).toHaveAccessibleDescription(expect.stringContaining("Não escreva o desconto à mão."))
    expect(screen.getByLabelText("Segundos depois de chegar")).toHaveAccessibleDescription("Informe um número inteiro de 0 a 60.")
  })

  it("submits, says the API's refusal, and says it was saved", async () => {
    const { onSubmit, rerender, onChange } = form()

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalledOnce()

    const shared = { value: popupValues, onChange, onSubmit, choices: popupChoices, defaults: popupDefaults }
    rerender(<PopupForm {...shared} error="Confira os campos: algum está fora do limite." />)
    expect(screen.getByText("Confira os campos: algum está fora do limite.")).toBeInTheDocument()

    rerender(<PopupForm {...shared} saved />)
    expect(screen.getByText("Pop-up salvo.")).toBeInTheDocument()

    rerender(<PopupForm {...shared} pending />)
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
    expect(screen.getByLabelText("Título")).toBeDisabled()
  })

  it("is written in the screen's language", () => {
    form({ messages: en })

    expect(screen.getByRole("switch", { name: "Show the pop-up at the shop" })).toBeInTheDocument()
  })

  it("has no accessibility violations, with and without refusals", async () => {
    const plain = form()
    await expectNoA11yViolations(plain.container)
    plain.unmount()

    const refused = form({ value: { ...popupValues, enabled: true, imageUrl: popupPicture, trigger: "ON_LEAVE" }, issues: { title: "Não escreva o desconto à mão." }, error: "Não foi possível salvar o pop-up. Tente de novo." })
    await expectNoA11yViolations(refused.container)
  })
})

describe("PopupPreview", () => {
  it("draws the pop-up's words as a visitor reads them, under what it is announcing", () => {
    preview()

    const region = screen.getByRole("region", { name: "Prévia" })
    expect(within(region).getByText("Ganhe 5% de desconto na primeira compra")).toBeInTheDocument()
    expect(within(region).getByText("Crie sua conta e o desconto é seu.")).toBeInTheDocument()
    expect(within(region).getByText("Ganhar cupom")).toBeInTheDocument()
    expect(within(region).getByText("O pop-up está anunciando 5% de desconto.")).toBeInTheDocument()
  })

  it("says, with all its letters, that no discount is promised at a shop with no benefit", () => {
    preview({ words: popupPlainWords, announcing: popupAnnouncingNothing })

    const region = screen.getByRole("region", { name: "Prévia" })
    expect(within(region).getByText(/não promete desconto nenhum/)).toBeInTheDocument()
    expect(within(region).getByText("Crie sua conta na loja")).toBeInTheDocument()
    expect(within(region).getByText("Criar minha conta")).toBeInTheDocument()
  })

  it("has nothing to operate in the card: no link, no dialog, no close that closes", () => {
    preview({ imageUrl: popupPicture })

    const region = screen.getByRole("region", { name: "Prévia" })
    expect(within(region).queryByRole("link")).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
    // The two buttons are the width toggle's, and nothing else.
    expect(within(region).getAllByRole("button").map((button) => button.textContent)).toEqual(["Computador", "Celular"])
  })

  it("switches between a computer's width and a phone's", async () => {
    const { container } = preview({ imageUrl: popupPicture })
    const frame = () => container.querySelector("[data-preview-width]")

    expect(screen.getByRole("button", { name: "Computador" })).toHaveAttribute("aria-pressed", "true")
    expect(frame()).toHaveAttribute("data-preview-width", "desktop")
    expect(frame()).toHaveClass("w-[45rem]")

    await userEvent.click(screen.getByRole("button", { name: "Celular" }))
    expect(frame()).toHaveAttribute("data-preview-width", "phone")
    expect(frame()).toHaveClass("w-[22.375rem]")
  })

  it("is as narrow as the real dialog when the shop gave no picture", () => {
    const { container } = preview({ imageUrl: null })

    expect(container.querySelector("[data-preview-width]")).toHaveClass("w-[28rem]")
    expect(container.querySelector("img")).toBeNull()
  })

  it("wears the shop's colours through the variables it is handed", () => {
    const { container } = preview({ style: { "--shop-primary": "var(--color-primary)" } as PopupPreviewProps["style"] })

    const painted = container.querySelector<HTMLElement>("[data-preview-width]")?.parentElement

    expect(painted?.style.getPropertyValue("--shop-primary")).toBe("var(--color-primary)")
  })

  it("has no accessibility violations", async () => {
    const { container } = preview({ imageUrl: popupPicture, announcing: { ...popupAnnouncingNothing, note: "Os textos que você escreveu aparecem como estão." } })

    await expectNoA11yViolations(container)
  })
})
