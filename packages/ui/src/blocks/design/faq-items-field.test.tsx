// Libs
import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { FaqItemsField, type FaqValue } from "./faq-items-field"

const rows: FaqValue[] = [
  { id: "a", question: "Qual o prazo?", answer: "Três dias." },
  { id: "b", question: "Posso trocar?", answer: "Sim." },
]

/** The field as a screen holds it, so a change redraws it the way the sheet would. */
function Held({ initial }: { initial: FaqValue[] }) {
  const [value, setValue] = useState(initial)
  return <FaqItemsField value={value} onChange={setValue} newItemId={() => "nova"} />
}

describe("FaqItemsField", () => {
  it("writes a question and its answer", async () => {
    const onChange = vi.fn()
    render(<FaqItemsField value={rows} onChange={onChange} newItemId={() => "nova"} />)

    await userEvent.type(screen.getAllByLabelText("Resposta")[1]!, "!")
    expect(onChange).toHaveBeenLastCalledWith([rows[0], { ...rows[1], answer: "Sim.!" }])
  })

  it("moves a question one place and keeps the focus on the button pressed", async () => {
    const user = userEvent.setup()
    render(<Held initial={rows} />)

    expect(screen.getByRole("button", { name: "Subir Qual o prazo?" })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("button", { name: "Subir Posso trocar?" }))

    expect(screen.getAllByLabelText("Pergunta").map((input) => (input as HTMLInputElement).value)).toEqual(["Posso trocar?", "Qual o prazo?"])
    expect(screen.getByRole("button", { name: "Subir Posso trocar?" })).toHaveFocus()
  })

  it("adds a question at the end and takes the focus to it", async () => {
    const user = userEvent.setup()
    render(<Held initial={rows} />)

    await user.click(screen.getByRole("button", { name: "Adicionar pergunta" }))
    const inputs = screen.getAllByLabelText("Pergunta")
    expect(inputs).toHaveLength(3)
    expect(inputs[2]).toHaveFocus()
  })

  it("takes a question out and gives the focus to the one that took its place", async () => {
    const user = userEvent.setup()
    render(<Held initial={rows} />)

    await user.click(screen.getByRole("button", { name: "Remover Qual o prazo?" }))
    expect(screen.getAllByLabelText("Pergunta")).toHaveLength(1)
    expect(screen.getByLabelText("Pergunta")).toHaveFocus()
  })

  it("says a written question is waiting for its answer, where the answer is", () => {
    render(<FaqItemsField value={[{ id: "a", question: "Tem retirada?", answer: "" }]} onChange={vi.fn()} newItemId={() => "nova"} />)

    const answer = screen.getByLabelText("Resposta")
    expect(answer).toHaveAttribute("aria-invalid", "true")
    expect(answer).toHaveAccessibleDescription("Escreva a resposta de cada pergunta para salvar.")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <FaqItemsField value={[...rows, { id: "c", question: "Tem retirada?", answer: "" }]} onChange={vi.fn()} newItemId={() => "nova"} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
