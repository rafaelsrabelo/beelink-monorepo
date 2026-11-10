// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontKitBuilder, type StorefrontKitBuilderPart } from "./storefront-kit-builder"

const parts: StorefrontKitBuilderPart[] = [
  { key: "ninho", name: "Ninho com Nutella", imageUrl: null, available: true },
  { key: "pacoca", name: "Paçoquinha", imageUrl: null, available: true },
  { key: "limao", name: "Torta de Limão", imageUrl: null, available: false },
]

function Held({ size = 3 }: { size?: number }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  return <StorefrontKitBuilder size={size} parts={parts} counts={counts} onChange={(key, count) => setCounts((now) => ({ ...now, [key]: count }))} />
}

describe("StorefrontKitBuilder", () => {
  it("asks for the kit's size, counts what is chosen, and says when it is whole", async () => {
    render(<Held />)

    expect(screen.getByRole("heading", { name: "Monte seu kit" })).toBeInTheDocument()
    expect(screen.getByText("Escolha 3 itens — pode repetir.")).toBeInTheDocument()
    expect(screen.getByText("0 de 3")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Pôr mais um Ninho com Nutella no kit" }))
    await userEvent.click(screen.getByRole("button", { name: "Pôr mais um Ninho com Nutella no kit" }))
    expect(screen.getByText("2 de 3")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Pôr mais um Paçoquinha no kit" }))

    expect(screen.getByText("Kit completo!")).toBeInTheDocument()
    // Full: nothing more goes in; a product can still be taken out.
    expect(screen.getByRole("button", { name: "Pôr mais um Paçoquinha no kit" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Tirar um Ninho com Nutella do kit" })).toBeEnabled()
  })

  it("marks a product that ran out, and lets none of it in", () => {
    render(<Held />)

    expect(screen.getByRole("group", { name: "Torta de Limão no kit" })).toBeInTheDocument()
    expect(screen.getByText("Esgotado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pôr mais um Torta de Limão no kit" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Tirar um Ninho com Nutella do kit" })).toBeDisabled()
  })

  it("says a kit with nothing to be put together from is not available", () => {
    render(<StorefrontKitBuilder size={20} parts={[]} counts={{}} onChange={() => {}} />)

    expect(screen.getByText("Este kit não está disponível agora.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Held />)
    await expectNoA11yViolations(container)
  })
})
