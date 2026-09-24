// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontRestockDialog, type StorefrontRestockDialogProps } from "./storefront-restock-dialog"

function renderDialog(overrides: Partial<StorefrontRestockDialogProps> = {}) {
  const props: StorefrontRestockDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    productName: "Blusa",
    variantLabel: "M · Areia",
    onSubmit: vi.fn(),
    status: "idle",
    ...overrides,
  }
  return { props, ...render(<StorefrontRestockDialog {...props} />) }
}

describe("StorefrontRestockDialog", () => {
  it("says which combination, and sends the number typed", async () => {
    const user = userEvent.setup()
    const { props } = renderDialog()

    expect(await screen.findByText("Blusa · M · Areia. A loja te chama no WhatsApp quando voltar.")).toBeInTheDocument()
    await user.type(screen.getByRole("textbox", { name: "WhatsApp" }), " (11) 97777-6666 ")
    await user.click(screen.getByRole("button", { name: "Avisar-me" }))

    expect(props.onSubmit).toHaveBeenCalledWith({ phone: "(11) 97777-6666", name: "", website: "" })
  })

  it("shows the refusal it is given, and no success until the screen says so", async () => {
    renderDialog({ error: "Informe o WhatsApp com DDD, entre 10 e 15 dígitos" })

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o WhatsApp com DDD")
    expect(screen.queryByText("Pronto! Avisaremos no WhatsApp.")).toBeNull()
  })

  it("confirms once the request was saved", async () => {
    renderDialog({ status: "sent" })

    expect(await screen.findByRole("status")).toHaveTextContent("Pronto! Avisaremos no WhatsApp.")
  })

  it("has no accessibility violations", async () => {
    renderDialog()

    await expectNoA11yViolations(await screen.findByRole("dialog"))
  })
})
