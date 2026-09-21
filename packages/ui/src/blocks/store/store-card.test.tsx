// React
import type { ComponentProps } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreCard } from "./store-card"
import { sampleStore, sampleStores } from "./store.fixtures"

describe("StoreCard", () => {
  it("shows who the shop is and where it lives", () => {
    render(<StoreCard store={sampleStore} panelHref="/admin/doces-da-ana" />)

    expect(screen.getByText("Doces da Ana")).toBeInTheDocument()
    expect(screen.getByText("/doces-da-ana")).toBeInTheDocument()
    expect(screen.getByText("Loja")).toBeInTheDocument()
  })

  it("names the shop in the link, so a list of cards does not repeat one word", () => {
    render(<StoreCard store={sampleStore} panelHref="/admin/doces-da-ana" />)

    expect(screen.getByRole("link", { name: "Gerenciar Doces da Ana" })).toHaveAttribute(
      "href",
      "/admin/doces-da-ana",
    )
  })

  it("offers the shop window only when there is one to open", () => {
    const { rerender } = render(<StoreCard store={sampleStore} panelHref="/admin/doces-da-ana" />)
    expect(screen.queryByRole("link", { name: /Ver loja/ })).not.toBeInTheDocument()

    rerender(
      <StoreCard
        store={sampleStore}
        panelHref="/admin/doces-da-ana"
        storefrontHref="/doces-da-ana"
      />,
    )
    expect(screen.getByRole("link", { name: "Ver loja Doces da Ana" })).toHaveAttribute(
      "href",
      "/doces-da-ana",
    )
  })

  it("names the shop's selling mode on the badge", () => {
    render(<StoreCard store={sampleStores[1]} panelHref="/admin/nutri-suplementos" />)

    expect(screen.getByText("Loja")).toBeInTheDocument()
  })

  it("navigates through the link the app injects, not one of its own", () => {
    const Link = ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
      <a href={href} data-testid="app-link" {...props} />
    )
    render(<StoreCard store={sampleStore} panelHref="/painel" linkComponent={Link} />)

    expect(screen.getAllByTestId("app-link").length).toBeGreaterThan(0)
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<StoreCard store={sampleStore} panelHref="/admin/doces-da-ana" messages={en} />)

    expect(screen.getByRole("link", { name: "Manage Doces da Ana" })).toBeInTheDocument()
    expect(screen.getByText("Shop")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreCard
        store={sampleStores[1]}
        panelHref="/admin/nutri-suplementos"
        storefrontHref="/nutri-suplementos"
      />,
    )

    await expectNoA11yViolations(container)
  })
})
