// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { VerifyEmailStatus } from "./verify-email-status"

describe("VerifyEmailStatus", () => {
  it("waits with a skeleton, never a spinner or the word loading", () => {
    const { container } = render(<VerifyEmailStatus state="checking" />)

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument()
  })

  it("points a verified person at the sign-in screen", () => {
    render(<VerifyEmailStatus state="verified" />)

    expect(screen.getByText("E-mail confirmado")).toBeInTheDocument()
    expect(screen.getByText("Ir para a tela de entrada").closest("a")).toHaveAttribute("href", "/login")
  })

  it("offers a new link when the old one is spent", async () => {
    const onResend = vi.fn()
    render(<VerifyEmailStatus state="invalid" onResend={onResend} />)

    await userEvent.click(screen.getByRole("button", { name: "Enviar novo link" }))

    expect(onResend).toHaveBeenCalledOnce()
  })

  it("confirms the new link was sent", () => {
    render(<VerifyEmailStatus state="invalid" onResend={vi.fn()} resent />)

    expect(screen.getByText(/Enviamos um novo link/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Enviar novo link" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations in any state", async () => {
    for (const state of ["checking", "verified", "invalid"] as const) {
      const { container, unmount } = render(<VerifyEmailStatus state={state} onResend={vi.fn()} />)
      await expectNoA11yViolations(container)
      unmount()
    }
  })
})
