// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

// Types
import type { Section } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { BandEditor } from "./band-editor"

function band(name: string | null): Section {
  return {
    id: "b2",
    name,
    width: "CONTAINED",
    background: null,
    position: 1,
    isActive: true,
    components: [],
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  }
}

function open(section: Section) {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const onClose = vi.fn()
  render(<BandEditor slug="loja" section={section} position={2} pageBackground="" onClose={onClose} messages={ptBR} />, { wrapper })
  return { onClose }
}

describe("BandEditor — the sheet is titled by the band", () => {
  // Reproduced: the panel said HERO SECTION and the sheet it opened said "Faixa 2".
  it("titles a named band's sheet by its name, and an unnamed one by its place", () => {
    open(band("HERO SECTION"))
    expect(screen.getByRole("heading", { name: "HERO SECTION" })).toBeInTheDocument()
  })

  it("keeps an unnamed band's sheet at its place", () => {
    open(band(null))
    expect(screen.getByRole("heading", { name: "Faixa 2" })).toBeInTheDocument()
  })

  it("renames the sheet as the name is typed, without closing it", async () => {
    const user = userEvent.setup()
    const { onClose } = open(band(null))

    await user.type(screen.getByLabelText("Nome da faixa"), "Serviços")
    expect(screen.getByRole("heading", { name: "Serviços" })).toBeInTheDocument()

    await user.clear(screen.getByLabelText("Nome da faixa"))
    expect(screen.getByRole("heading", { name: "Faixa 2" })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("renames a named band's sheet as it is typed, and falls back to its place when cleared", async () => {
    const user = userEvent.setup()
    open(band("A5 grade"))

    await user.clear(screen.getByLabelText("Nome da faixa"))
    expect(screen.getByRole("heading", { name: "Faixa 2" })).toBeInTheDocument()

    await user.type(screen.getByLabelText("Nome da faixa"), "Grade de verão")
    expect(screen.getByRole("heading", { name: "Grade de verão" })).toBeInTheDocument()
  })
})
