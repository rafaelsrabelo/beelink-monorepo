// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreSocialFields } from "./store-social-fields"
import { sampleStoreSettingsValues } from "./store.fixtures"

const values = sampleStoreSettingsValues.social

function renderFields(overrides: Partial<Parameters<typeof StoreSocialFields>[0]> = {}) {
  const onChange = vi.fn()
  render(<StoreSocialFields value={values} onChange={onChange} {...overrides} />)
  return { onChange }
}

describe("StoreSocialFields", () => {
  it("hands the whole group back when the WhatsApp changes", async () => {
    const { onChange } = renderFields()

    await userEvent.type(screen.getByLabelText("WhatsApp"), "9")

    expect(onChange).toHaveBeenCalledWith({ ...values, whatsapp: `${values.whatsapp}9` })
  })

  it("stores a handle without the @ someone typed in front of it", async () => {
    const { onChange } = renderFields({ value: { ...values, instagram: "" } })

    await userEvent.type(screen.getByLabelText("Instagram"), "@")

    expect(onChange).toHaveBeenCalledWith({ ...values, instagram: "" })
  })

  it("renders the verdict the screen's form handed it", () => {
    renderFields({ errors: { whatsapp: { message: "Informe o WhatsApp que recebe os pedidos" } } })

    expect(screen.getByRole("alert")).toHaveTextContent("Informe o WhatsApp que recebe os pedidos")
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("aria-invalid", "true")
  })

  it("asks Spotify for a URL, because it has no handle to expand", () => {
    renderFields()

    expect(screen.getByLabelText("Spotify")).toHaveAttribute("type", "url")
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderFields({ messages: en })

    expect(screen.getByText("This is where your orders arrive.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreSocialFields
        value={{ ...values, whatsapp: "" }}
        onChange={vi.fn()}
        errors={{ whatsapp: { message: "Informe o WhatsApp que recebe os pedidos" } }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
