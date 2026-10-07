// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOfferStrip } from "./storefront-offer-strip"

const signUp = { message: "Crie sua conta e ganhe 10% de desconto no primeiro pedido.", action: { label: "Criar conta", href: "/loja/entrar?modo=criar&voltar=%2Floja" } }
const coupon = { message: "Seu primeiro pedido tem 10% de desconto com o cupom", code: "PRIMEIRA10", action: { label: "Usar no carrinho", href: "/loja/carrinho?cupom=PRIMEIRA10" } }
const promotion = { message: "Seu primeiro pedido tem 15% de desconto, aplicado automaticamente." }

describe("StorefrontOfferStrip", () => {
  it("is a named region in the page's flow, never fixed over it", () => {
    render(<StorefrontOfferStrip {...signUp} />)

    const strip = screen.getByRole("region", { name: "Oferta da loja" })
    expect(strip).not.toHaveClass("fixed", "sticky", "absolute")
    // It is there when the page arrives: nothing is announced.
    expect(strip).not.toHaveAttribute("role", "status")
    expect(strip).not.toHaveAttribute("aria-live")
  })

  describe("for a visitor", () => {
    it("says the invitation it was handed and leads to the shop's sign-up, with the way back", () => {
      render(<StorefrontOfferStrip {...signUp} />)

      expect(screen.getByText("Crie sua conta e ganhe 10% de desconto no primeiro pedido.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/loja/entrar?modo=criar&voltar=%2Floja")
    })

    it("draws no code and nothing to copy", () => {
      render(<StorefrontOfferStrip {...signUp} detail="Em compras a partir de R$ 50,00." />)

      expect(screen.getByText(/Em compras a partir de R\$ 50,00\./)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Copiar/ })).toBeNull()
      expect(screen.getByRole("region").querySelector("strong")).toBeNull()
    })
  })

  describe("for a customer with a first-order coupon", () => {
    it("says the benefit, the code after it, and leads to the cart with the coupon in its address", () => {
      render(<StorefrontOfferStrip {...coupon} />)

      const strip = screen.getByRole("region", { name: "Oferta da loja" })
      expect(strip).toHaveTextContent("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10")
      expect(within(strip).getByText("PRIMEIRA10").tagName).toBe("STRONG")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
    })

    it("copies the code, and says it did", async () => {
      const user = userEvent.setup()
      const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
      render(<StorefrontOfferStrip {...coupon} />)

      const copy = screen.getByRole("button", { name: "Copiar" })
      // Described by the code itself: "Copiar" alone does not say what.
      expect(copy).toHaveAccessibleDescription("PRIMEIRA10")
      await user.click(copy)

      expect(writeText).toHaveBeenCalledWith("PRIMEIRA10")
      expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument()
    })
  })

  describe("for a customer with a first-order promotion", () => {
    it("says it applies by itself, with nothing to press but the close", () => {
      render(<StorefrontOfferStrip {...promotion} onDismiss={() => {}} />)

      expect(screen.getByText("Seu primeiro pedido tem 15% de desconto, aplicado automaticamente.")).toBeInTheDocument()
      expect(screen.queryByRole("link")).toBeNull()
      expect(screen.getAllByRole("button")).toHaveLength(1)
    })
  })

  describe("closing", () => {
    it("offers a 44px button that names itself, and tells the screen", async () => {
      const onDismiss = vi.fn()
      render(<StorefrontOfferStrip {...signUp} onDismiss={onDismiss} />)

      const close = screen.getByRole("button", { name: "Fechar aviso" })
      expect(close).toHaveClass("size-11")
      await userEvent.click(close)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    // BEELINK-311: following the offer's link is using it, and the screen is told.
    it("tells the screen when its link is pressed — and not when the code is copied", async () => {
      const onAction = vi.fn()
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
      render(<StorefrontOfferStrip {...coupon} onAction={onAction} onDismiss={() => {}} />)

      await userEvent.click(screen.getByRole("button", { name: "Copiar" }))
      expect(onAction).not.toHaveBeenCalled()

      const link = screen.getByRole("link", { name: "Usar no carrinho" })
      link.addEventListener("click", (event) => event.preventDefault())
      await userEvent.click(link)
      expect(onAction).toHaveBeenCalledTimes(1)
      // The link is still a link: the press is not swallowed.
      expect(link).toHaveAttribute("href", "/loja/carrinho?cupom=PRIMEIRA10")
    })

    it("offers none when the screen cannot close it", () => {
      render(<StorefrontOfferStrip {...signUp} />)

      expect(screen.queryByRole("button", { name: "Fechar aviso" })).toBeNull()
    })
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<StorefrontOfferStrip {...coupon} onDismiss={() => {}} messages={en} />)

    expect(screen.getByRole("region", { name: "Shop offer" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close notice" })).toBeInTheDocument()
  })

  it("has no accessibility violations, in each of its three states", async () => {
    for (const state of [signUp, { ...coupon, detail: "Em compras a partir de R$ 50,00." }, promotion]) {
      const { container, unmount } = render(<StorefrontOfferStrip {...state} onDismiss={() => {}} />)
      await expectNoA11yViolations(container)
      unmount()
    }
  })
})
