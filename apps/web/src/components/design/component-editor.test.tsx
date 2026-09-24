// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

// Types
import type { StoreComponent } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { en as web } from "@/locales/en"
import { ComponentEditor } from "./component-editor"

const heading: StoreComponent = {
  id: "c1",
  sectionId: "b1",
  kind: "HEADING",
  title: "Novidades",
  subtitle: null,
  body: null,
  span: "FULL",
  display: null,
  source: null,
  sourceCategoryId: null,
  limit: null,
  items: [],
  columns: null,
  align: null,
  position: 0,
  isActive: true,
  createdAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
}

function Screen({ component, onClose }: { component: StoreComponent | null; onClose: () => void }) {
  return (
    <>
      <button type="button">Bloco no preview</button>
      <ComponentEditor
        slug="loja"
        component={component}
        bandBackground={null}
        pageBackground=""
        categoriesShown={0}
        shelfEmpty={false}
        onClose={onClose}
        messages={ptBR}
        web={web}
      />
    </>
  )
}

const client = new QueryClient()
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

describe("ComponentEditor — the panel's inspector", () => {
  // Chosen from the preview, the focus would otherwise stay on the block there.
  it("takes the focus to its title, and gives it back to the opener when it closes", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(<Screen component={null} onClose={onClose} />, { wrapper })
    screen.getByRole("button", { name: "Bloco no preview" }).focus()

    rerender(<Screen component={heading} onClose={onClose} />)
    expect(screen.getByRole("heading", { name: "Editar componente" })).toHaveFocus()
    expect(screen.getByRole("region", { name: "Editar componente" })).toHaveTextContent("Novidades")

    await user.click(screen.getByRole("button", { name: "Fechar os campos do bloco" }))
    expect(onClose).toHaveBeenCalledOnce()

    rerender(<Screen component={null} onClose={onClose} />)
    expect(screen.getByRole("button", { name: "Bloco no preview" })).toHaveFocus()
  })
})
