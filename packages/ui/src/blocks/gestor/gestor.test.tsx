// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { GestorBoard } from "./gestor-board"
import { GestorCouponList } from "./gestor-coupon-list"
import { GestorCourier } from "./gestor-courier"
import { GestorFrame, initialsOf } from "./gestor-frame"
import { GestorStart } from "./gestor-start"
import { gestorColumns, gestorCoupons, gestorEmptyColumns, gestorNav } from "./gestor.fixtures"

const noop = () => undefined

describe("the manager's frame", () => {
  it("names the shop, its three places and the bell's switch", async () => {
    const onSoundChange = vi.fn()
    const { container } = render(
      <GestorFrame shopName="Dindin da Leia" today="terça-feira, 10 de novembro" nav={gestorNav} current="orders" backHref="/admin/leia" soundOn onSoundChange={onSoundChange} onTestSound={noop}>
        <p>quadro</p>
      </GestorFrame>,
    )
    const nav = screen.getByRole("navigation", { name: "Modo gestor" })
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual(["Pedidos 2", "Cupons ", "Conversas 1"])
    expect(within(nav).getByRole("link", { name: /Pedidos/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Voltar ao painel completo" })).toHaveAttribute("href", "/admin/leia")

    await userEvent.click(screen.getByRole("button", { name: "Desligar o som" }))
    expect(onSoundChange).toHaveBeenCalledWith(false)
    await expectNoA11yViolations(container)
  })

  it("takes two words of a name for its tile, never a 'da'", () => {
    expect(initialsOf("Dindin da Leia")).toBe("DL")
    expect(initialsOf("Mutante")).toBe("MU")
  })
})

describe("the board", () => {
  it("rings for the order waiting the longest, and accepts or refuses it", async () => {
    const onAccept = vi.fn()
    const onRefuse = vi.fn()
    const { container } = render(<GestorBoard columns={gestorColumns} onAccept={onAccept} onRefuse={onRefuse} current={1041} allOrdersHref="/orders" newSaleHref="/orders/new" />)

    const band = screen.getByRole("region", { name: "Pedido novo #1043 · R$ 159,60" })
    expect(band).toHaveTextContent("Mais 1 esperando")
    await userEvent.click(within(band).getByRole("button", { name: "Aceitar pedido" }))
    expect(onAccept).toHaveBeenCalledWith(1043)
    await userEvent.click(within(band).getByRole("button", { name: "Recusar" }))
    expect(onRefuse).toHaveBeenCalledWith(1043)
    await expectNoA11yViolations(container)
  })

  it("lays the orders out new to done, with accepting on the new ones only", async () => {
    const onAccept = vi.fn()
    render(<GestorBoard columns={gestorColumns} onAccept={onAccept} onRefuse={noop} current={1041} allOrdersHref="/orders" newSaleHref="/orders/new" />)

    const fresh = screen.getByRole("region", { name: "Novos 2" })
    await userEvent.click(within(fresh).getAllByRole("button", { name: "Aceitar" })[1]!)
    expect(onAccept).toHaveBeenCalledWith(1044)

    const making = screen.getByRole("region", { name: "Em preparo 2" })
    expect(within(making).queryByRole("button")).toBeNull()
    expect(within(making).getByRole("link", { name: /#1041/ })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("region", { name: "Concluídos 1" })).toHaveTextContent("Ver todos os pedidos")
  })

  it("says the counter is quiet when nothing is new", () => {
    render(<GestorBoard columns={gestorEmptyColumns} onAccept={noop} onRefuse={noop} allOrdersHref="/orders" newSaleHref="/orders/new" />)
    expect(screen.queryByRole("region", { name: /Pedido novo/ })).toBeNull()
    expect(screen.getByText("Nenhum pedido novo. O próximo toca a campainha.")).toBeInTheDocument()
  })
})

describe("the rest of the manager", () => {
  it("switches a coupon by its code", async () => {
    const onToggle = vi.fn()
    const { container } = render(<GestorCouponList rows={gestorCoupons} onToggle={onToggle} createHref="/new" editHrefOf={(id) => `/c/${id}`} />)
    await userEvent.click(screen.getByRole("switch", { name: "Cupom KITFESTA15" }))
    expect(onToggle).toHaveBeenCalledWith("c3", true)
    await expectNoA11yViolations(container)
  })

  it("sends the shop's courier the delivery, or says there is no address", async () => {
    const { container, rerender } = render(<GestorCourier whatsappHref="https://wa.me/?text=x" />)
    expect(screen.getByRole("link", { name: "Mandar para o motoboy no WhatsApp" })).toHaveAttribute("href", "https://wa.me/?text=x")
    await expectNoA11yViolations(container)
    rerender(<GestorCourier whatsappHref={null} />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByText("Este pedido não tem endereço de entrega.")).toBeInTheDocument()
  })

  it("opens with the tap the bell needs", async () => {
    const onStart = vi.fn()
    render(<GestorStart open onStart={onStart} />)
    await userEvent.click(screen.getByRole("button", { name: "Começar" }))
    expect(onStart).toHaveBeenCalled()
  })
})
