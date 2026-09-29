// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminNotifications, type AdminNotification } from "./admin-notifications"

const items: AdminNotification[] = [
  { id: "o21", kind: "order", title: "Novo pedido nº 21", detail: "Bia Souza · R$ 129,90", when: "10:41", href: "/admin/loja/orders/21" },
  { id: "m18", kind: "message", title: "Mensagem no pedido nº 18", detail: "Carla: chega até sexta?", when: "10:12", href: "/admin/loja/orders/18" },
]

describe("AdminNotifications", () => {
  it("counts on the bell, and opens the latest of what came in, each to its order", async () => {
    render(<AdminNotifications unread={3} items={items} ordersHref="/admin/loja/orders?status=RECEIVED" />)

    await userEvent.click(screen.getByRole("button", { name: "Notificações (3 não lidas)" }))

    expect(await screen.findByRole("link", { name: /Novo pedido nº 21/ })).toHaveAttribute("href", "/admin/loja/orders/21")
    expect(screen.getByRole("link", { name: /Mensagem no pedido nº 18/ })).toHaveAttribute("href", "/admin/loja/orders/18")
    expect(screen.getByRole("link", { name: "Ver pedidos novos" })).toHaveAttribute("href", "/admin/loja/orders?status=RECEIVED")
  })

  it("says there is nothing new", async () => {
    render(<AdminNotifications unread={0} items={[]} />)
    await userEvent.click(screen.getByRole("button", { name: "Notificações" }))
    expect(await screen.findByText("Nada novo por aqui.")).toBeInTheDocument()
  })

  it("has no accessibility violations, open", async () => {
    render(<AdminNotifications unread={2} items={items} ordersHref="#" />)
    await userEvent.click(screen.getByRole("button"))
    await expectNoA11yViolations(await screen.findByRole("dialog"))
  })
})
