// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFaq } from "./storefront-faq"

const items = [
  { id: "entrega", question: "Quanto tempo leva a entrega?", answer: "De 2 a 5 dias úteis." },
  { id: "troca", question: "Posso trocar?", answer: "Sim, em até 7 dias." },
]

describe("StorefrontFaq", () => {
  it("has every answer in the page even closed, as a crawler reads it", () => {
    const { container } = render(<StorefrontFaq id="f1" title="Dúvidas" items={items} />)

    expect(container).toHaveTextContent("De 2 a 5 dias úteis.")
    expect(container).toHaveTextContent("Sim, em até 7 dias.")
    expect(container.querySelectorAll("details[open]")).toHaveLength(0)
  })

  // The browser turns Enter and Space on a summary into its click; jsdom does not, so the click is
  // what is pressed here, and the keyboard's part is that the question takes the focus at all.
  it("reaches each question from the keyboard, and opens it", async () => {
    const { container } = render(<StorefrontFaq id="f1" items={items} />)

    await userEvent.tab()
    const summary = screen.getByText("Quanto tempo leva a entrega?").closest("summary")!
    expect(summary).toHaveFocus()
    await userEvent.click(summary)
    expect(container.querySelector("details")).toHaveAttribute("open")
  })

  it("groups its questions by the block, so opening one closes the others of this FAQ only", () => {
    const { container } = render(
      <>
        <StorefrontFaq id="f1" items={items} />
        <StorefrontFaq id="f2" items={items} />
      </>,
    )

    const names = [...container.querySelectorAll("details")].map((details) => details.getAttribute("name"))
    expect(names).toEqual(["faq-f1", "faq-f1", "faq-f2", "faq-f2"])
  })

  it("titles the block as a section and keeps the questions out of the outline", () => {
    render(<StorefrontFaq id="f1" title="Dúvidas" items={items} />)

    expect(screen.getAllByRole("heading")).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 2, name: "Dúvidas" })).toBeInTheDocument()
  })

  it("draws nothing with no questions", () => {
    const { container } = render(<StorefrontFaq id="f1" title="Dúvidas" items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <StorefrontFaq id="f1" title="Dúvidas" subtitle="Antes de comprar" items={items} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
