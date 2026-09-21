// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreImageField } from "./store-image-field"

const sampleImage = "https://cdn.exemplo.com/logo.png"

function renderField(overrides: Partial<Parameters<typeof StoreImageField>[0]> = {}) {
  const onChange = vi.fn()
  const onUpload = vi.fn(async () => sampleImage)
  render(
    <StoreImageField
      id="store-logo"
      label="Logo da loja"
      previewAlt="Pré-visualização da logo"
      value=""
      onChange={onChange}
      onUpload={onUpload}
      {...overrides}
    />,
  )
  return { onChange, onUpload }
}

function pngNamed(name: string): File {
  return new File(["bytes"], name, { type: "image/png" })
}

describe("StoreImageField", () => {
  it("hands the chosen file to whoever stores bytes, and reports back the URL it answers", async () => {
    const { onChange, onUpload } = renderField()

    const file = pngNamed("logo.png")
    await userEvent.upload(screen.getByLabelText("Enviar arquivo"), file)

    expect(onUpload).toHaveBeenCalledWith(file)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(sampleImage))
  })

  it("clears the input after an upload, so picking the same file twice still fires", async () => {
    const { onUpload } = renderField()

    const input = screen.getByLabelText<HTMLInputElement>("Enviar arquivo")
    await userEvent.upload(input, pngNamed("logo.png"))

    await waitFor(() => expect(input.value).toBe(""))
    expect(onUpload).toHaveBeenCalledTimes(1)
  })

  it("survives a refused upload without reporting a value, and leaves the field usable", async () => {
    const onChange = vi.fn()
    const onUpload = vi.fn(async () => {
      throw new Error("501")
    })
    render(
      <StoreImageField
        id="store-logo"
        label="Logo da loja"
        previewAlt="Pré-visualização da logo"
        value=""
        onChange={onChange}
        onUpload={onUpload}
      />,
    )

    const input = screen.getByLabelText<HTMLInputElement>("Enviar arquivo")
    await userEvent.upload(input, pngNamed("logo.png"))

    await waitFor(() => expect(input.value).toBe(""))
    expect(onChange).not.toHaveBeenCalled()
    expect(input).not.toBeDisabled()
  })

  it("keeps a real file input rather than a div someone can only click", () => {
    renderField()

    const input = screen.getByLabelText("Enviar arquivo")
    expect(input.tagName).toBe("INPUT")
    expect(input).toHaveAttribute("type", "file")
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,image/webp")
  })

  it("shows the picture the shop has now, and a way to drop it", async () => {
    const { onChange } = renderField({ value: sampleImage })

    expect(screen.getByAltText("Pré-visualização da logo")).toHaveAttribute("src", sampleImage)

    await userEvent.click(screen.getByRole("button", { name: "Remover imagem" }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("offers nothing to remove while there is no image", () => {
    renderField()

    expect(screen.queryByRole("button", { name: "Remover imagem" })).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Nenhuma imagem escolhida" })).toBeInTheDocument()
  })

  it("drops to the address field alone when no upload is wired up", () => {
    renderField({ onUpload: undefined, value: sampleImage })

    expect(screen.queryByLabelText("Enviar arquivo")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Ou cole o endereço da imagem")).toHaveValue(sampleImage)
  })

  it("takes no new file while the screen's upload is in flight", () => {
    renderField({ pending: true })

    expect(screen.getByLabelText("Enviar arquivo")).toBeDisabled()
    expect(screen.getByText("Enviando…")).toBeInTheDocument()
  })

  it("renders the verdict the screen's form handed it", () => {
    renderField({ value: "nao-e-um-endereco", error: { message: "Informe um endereço válido" } })

    expect(screen.getByRole("alert")).toHaveTextContent("Informe um endereço válido")
    expect(screen.getByLabelText("Ou cole o endereço da imagem")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderField({ messages: en })

    expect(screen.getByLabelText("Upload a file")).toBeInTheDocument()
    expect(screen.queryByLabelText("Enviar arquivo")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreImageField
        id="store-logo"
        label="Logo da loja"
        hint="Uma imagem quadrada fica melhor."
        previewAlt="Pré-visualização da logo"
        value={sampleImage}
        onChange={vi.fn()}
        onUpload={vi.fn(async () => sampleImage)}
        error={{ message: "Informe um endereço válido" }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
