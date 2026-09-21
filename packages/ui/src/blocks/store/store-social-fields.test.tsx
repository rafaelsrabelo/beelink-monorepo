// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreSocialFields, maskPhone } from "./store-social-fields"
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

  describe("the WhatsApp mask", () => {
    // The screen sends digits — toCreatePayload strips this — so the mask is only what is seen.
    it.each([
      ["", ""],
      ["8", "(8"],
      ["85", "(85"],
      ["8599", "(85) 99"],
      ["8599410068", "(85) 9941-0068"],
      ["85994100683", "(85) 99410-0683"],
      // Past eleven digits it is a number with a country code, and those have no single shape.
      ["5585994100683", "5585994100683"],
    ])("formats %s as %s", (typed, shown) => {
      expect(maskPhone(typed)).toBe(shown)
    })

    it("is the same whether the digits arrive typed or already formatted", () => {
      expect(maskPhone("(85) 99410-0683")).toBe("(85) 99410-0683")
    })

    it("drops anything that is not a digit, however it was pasted", () => {
      expect(maskPhone("+55 (85) 99410-0683")).toBe("5585994100683")
      expect(maskPhone("85 99410 0683")).toBe("(85) 99410-0683")
    })

    it("shows a stored number formatted, rather than the digits it is saved as", () => {
      renderFields({ value: { ...values, whatsapp: "85994100683" } })

      expect(screen.getByLabelText("WhatsApp")).toHaveValue("(85) 99410-0683")
    })
  })

  it("names the network beside each handle field, so the prefix says where it goes", () => {
    renderFields()

    expect(screen.getByText("instagram.com/")).toBeInTheDocument()
    expect(screen.getByText("tiktok.com/@")).toBeInTheDocument()
    expect(screen.getByText("youtube.com/@")).toBeInTheDocument()
    // Spotify keeps the whole URL: an artist, a playlist and a user live on different paths.
    expect(screen.queryByText(/spotify\.com\//)).not.toBeInTheDocument()
  })

  it("marks each field with its own brand, and hides them from a screen reader", () => {
    const { container } = render(<StoreSocialFields value={values} onChange={vi.fn()} />)

    for (const brand of ["WhatsApp", "Instagram", "TikTok", "YouTube", "Spotify"]) {
      const icon = container.querySelector(`[data-brand="${brand}"]`)
      expect(icon, brand).not.toBeNull()
      // The label already names the network; an icon that repeats it makes every field read twice.
      expect(icon).toHaveAttribute("aria-hidden", "true")
    }
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
