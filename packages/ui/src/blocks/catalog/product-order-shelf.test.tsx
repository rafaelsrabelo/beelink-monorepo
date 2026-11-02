// React
import type { ComponentProps } from "react"

// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import type { ProductOrderItem } from "./product-order-row"
import { ProductOrderShelf } from "./product-order-shelf"

const item = (id: string, over: Partial<ProductOrderItem> = {}): ProductOrderItem => ({
  id,
  name: id,
  slug: id.toLowerCase(),
  priceCents: 13990,
  compareAtPriceCents: null,
  imageUrl: null,
  status: "ACTIVE",
  soldOut: false,
  ...over,
})

function Inert(props: ComponentProps<"a"> & { href: string }) {
  return <a {...props} href={undefined} />
}

describe("ProductOrderShelf", () => {
  it("draws each product as the shop's card, in the order given, with a grip named after it", async () => {
    const { container } = render(<ProductOrderShelf items={[item("Whey"), item("Creatina")]} onReorder={() => {}} linkComponent={Inert} />)

    const [whey, creatina] = screen.getAllByRole("listitem")
    expect(within(whey!).getByText("Whey")).toBeInTheDocument()
    expect(within(whey!).getByText("R$ 139,90")).toBeInTheDocument()
    expect(within(creatina!).getByRole("button", { name: "Arrastar: Creatina" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("is no way to a product's page: nothing on the board navigates", () => {
    render(<ProductOrderShelf items={[item("Whey")]} onReorder={() => {}} linkComponent={Inert} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("marks what holds a place the shop window does not show", () => {
    render(<ProductOrderShelf items={[item("Whey"), item("Creatina", { status: "DRAFT" }), item("Barra", { soldOut: true })]} onReorder={() => {}} linkComponent={Inert} />)

    const [whey, creatina, barra] = screen.getAllByRole("listitem")
    expect(within(whey!).queryByText("Rascunho")).not.toBeInTheDocument()
    expect(within(creatina!).getByText("Rascunho")).toBeInTheDocument()
    expect(within(barra!).getByText("Esgotado")).toBeInTheDocument()
  })

  it("stops the grip while saving", () => {
    render(<ProductOrderShelf items={[item("Whey")]} onReorder={() => {}} linkComponent={Inert} disabled />)

    expect(screen.getByRole("button", { name: "Arrastar: Whey" })).toBeDisabled()
  })
})
