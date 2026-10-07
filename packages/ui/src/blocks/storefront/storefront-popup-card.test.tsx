// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { popupPicture } from "./popup.fixtures"
import { POPUP_TEXT, POPUP_TITLE, StorefrontPopupCard, type StorefrontPopupCardProps } from "./storefront-popup-card"

const card = (props: Partial<StorefrontPopupCardProps> = {}) =>
  render(<StorefrontPopupCard heading={<h2 className={POPUP_TITLE}>Ganhe 5% de desconto</h2>} body={<p className={POPUP_TEXT}>Crie sua conta.</p>} action={{ label: "Ganhar cupom", href: "/loja/entrar?modo=criar" }} {...props} />)

describe("StorefrontPopupCard", () => {
  it("stacks by the room it is given, not by the screen's: a container, and two columns only with a picture", () => {
    const { container, rerender } = card({ imageUrl: popupPicture })
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass("@container")
    expect(root.firstElementChild).toHaveClass("@xl:grid-cols-2")
    // No rule of its own about the viewport: it would disagree with the panel's phone-wide preview.
    expect(container.innerHTML).not.toMatch(/\b(sm|md|lg|shop-md|shop-lg):/)

    rerender(<StorefrontPopupCard heading={<h2>Ganhe</h2>} body={<p>Crie</p>} action={{ label: "Ganhar cupom", href: "#" }} />)
    expect((container.firstElementChild as HTMLElement).firstElementChild).not.toHaveClass("@xl:grid-cols-2")
  })

  it("reserves the picture's frame before the file arrives, and draws it as decoration", () => {
    const { container } = card({ imageUrl: popupPicture })

    const picture = container.querySelector("img") as HTMLImageElement
    expect(picture).toHaveAttribute("alt", "")
    expect(picture).toHaveClass("absolute", "object-cover")
    expect(picture.parentElement).toHaveClass("aspect-[3/2]", "@xl:min-h-[26rem]")
  })

  it("wears the shop's primary through tokens", () => {
    const { container } = card()

    expect((container.firstElementChild as HTMLElement).firstElementChild).toHaveClass("bg-shop-primary", "text-shop-on-primary")
  })

  it("leads where it is told, with a target a thumb can press", () => {
    card()

    const link = screen.getByRole("link", { name: "Ganhar cupom" })
    expect(link).toHaveAttribute("href", "/loja/entrar?modo=criar")
    expect(link).toHaveClass("min-h-12")
  })

  it("as a preview, has nothing to operate and keeps its words", () => {
    card({ preview: true, close: <button type="button">Fechar</button> })

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("Ganhar cupom")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Ganhe 5% de desconto" })).toBeInTheDocument()
  })

  it("has no accessibility violations, live and as a preview", async () => {
    const live = card({ imageUrl: popupPicture, detail: "Em compras a partir de R$ 50,00.", close: <button type="button" aria-label="Fechar" /> })
    await expectNoA11yViolations(live.container)
    live.unmount()

    await expectNoA11yViolations(card({ preview: true }).container)
  })
})

describe("StorefrontPopupCard, with a customer's coupon (BEELINK-310)", () => {
  const code = { value: "PRIMEIRA10", copyLabel: "Copiar", copiedLabel: "Copiado", selectedLabel: "Código selecionado" }

  it("draws the code between the text and the button, with its copy button described by it", () => {
    card({ code, action: { label: "Usar no carrinho", href: "/loja/carrinho?cupom=PRIMEIRA10" } })

    const drawn = screen.getByText("PRIMEIRA10")
    expect(drawn).toHaveClass("select-all", "break-all")
    expect(screen.getByRole("button", { name: "Copiar" })).toHaveAccessibleDescription("PRIMEIRA10")
    expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
  })

  it("draws no code and no copy button when handed none", () => {
    const { container } = card()

    expect(container.querySelector("[data-popup-code]")).toBeNull()
    expect(screen.queryByRole("button", { name: "Copiar" })).toBeNull()
  })

  it("with no address to lead to, its action is a button", () => {
    card({ action: { label: "Continuar comprando" } })

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByRole("button", { name: "Continuar comprando" })).toHaveClass("min-h-12")
  })

  it("as a preview, shows the code and operates nothing", () => {
    card({ preview: true, code, action: { label: "Usar no carrinho", href: "" } })

    expect(screen.getByText("PRIMEIRA10")).toBeInTheDocument()
    expect(screen.getByText("Copiar")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("has no accessibility violations, live and as a preview", async () => {
    const live = card({ code, imageUrl: popupPicture, action: { label: "Usar no carrinho", href: "/loja/carrinho?cupom=PRIMEIRA10" }, close: <button type="button" aria-label="Fechar" /> })
    await expectNoA11yViolations(live.container)
    live.unmount()

    await expectNoA11yViolations(card({ preview: true, code }).container)
  })
})
