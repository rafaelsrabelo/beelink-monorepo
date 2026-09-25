// Libs
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreImageField } from "./store-image-field"

const sampleImage = "https://cdn.exemplo.com/logo.png"
const CTA = "Clique ou arraste a imagem aqui"

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

function imageNamed(name: string, type = "image/png", size = 1024): File {
  const file = new File(["bytes"], name, { type })
  // `new File` sizes itself from its contents, and a test that needs a 3 MB file should not have to
  // allocate one.
  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("StoreImageField", () => {
  it("hands the chosen file to whoever stores bytes, and reports back the URL it answers", async () => {
    const { onChange, onUpload } = renderField()

    const file = imageNamed("logo.png")
    await userEvent.upload(screen.getByLabelText(CTA), file)

    expect(onUpload).toHaveBeenCalledWith(file)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(sampleImage))
  })

  /**
   * The picture lands a second after the pick, and the owner may have typed meanwhile: handed to the
   * `onChange` of the pick's render, it would put that render's form back over what was typed.
   */
  it("hands a picture that lands late to the form as it is now, not as it was when picked", async () => {
    let land: (url: string) => void = () => undefined
    const onUpload = vi.fn(() => new Promise<string>((resolve) => (land = resolve)))
    const whenPicked = vi.fn()
    const now = vi.fn()
    const field = (onChange: (url: string) => void) => (
      <StoreImageField id="slide" label="Imagem" previewAlt="Imagem" value="" onChange={onChange} onUpload={onUpload} />
    )
    const { rerender } = render(field(whenPicked))

    await userEvent.upload(screen.getByLabelText(CTA), imageNamed("capa.png"))
    rerender(field(now))
    land(sampleImage)

    await waitFor(() => expect(now).toHaveBeenCalledWith(sampleImage))
    expect(whenPicked).not.toHaveBeenCalled()
  })

  it("hands a late picture to no one once the field has left the page", async () => {
    let land: (url: string) => void = () => undefined
    const onChange = vi.fn()
    const { unmount } = render(
      <StoreImageField
        id="slide"
        label="Imagem"
        previewAlt="Imagem"
        value=""
        onChange={onChange}
        onUpload={() => new Promise<string>((resolve) => (land = resolve))}
      />,
    )

    await userEvent.upload(screen.getByLabelText(CTA), imageNamed("capa.png"))
    unmount()
    land(sampleImage)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("takes a file dropped on the area, not only one picked through the dialog", async () => {
    const { onChange, onUpload } = renderField()

    const file = imageNamed("logo.png")
    const area = screen.getByLabelText(CTA).parentElement as HTMLElement

    fireEvent.dragOver(area, { dataTransfer: { files: [file] } })
    expect(screen.getByText("Solte a imagem para enviar")).toBeInTheDocument()

    fireEvent.drop(area, { dataTransfer: { files: [file] } })

    expect(onUpload).toHaveBeenCalledWith(file)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(sampleImage))
  })

  it("returns to the resting call to action when the drag leaves without a drop", () => {
    renderField()
    const area = screen.getByLabelText(CTA).parentElement as HTMLElement

    fireEvent.dragOver(area, { dataTransfer: { files: [] } })
    fireEvent.dragLeave(area)

    expect(screen.getByText(CTA)).toBeInTheDocument()
    expect(screen.queryByText("Solte a imagem para enviar")).not.toBeInTheDocument()
  })

  it("quotes the formats and the ceiling it actually enforces", () => {
    renderField({
      accept: "image/jpeg,image/gif,image/png",
      maxSizeBytes: 2 * 1024 * 1024,
      recommendedSize: { width: 1600, height: 838 },
    })

    expect(screen.getByText("Formatos aceitos: JPEG, GIF ou PNG de até 2 MB.")).toBeInTheDocument()
    expect(screen.getByText("Dimensão recomendada: 1600 x 838 pixels.")).toBeInTheDocument()
  })

  it("says nothing about dimensions when none are recommended", () => {
    renderField()

    expect(screen.queryByText(/Dimensão recomendada/)).not.toBeInTheDocument()
  })

  it("refuses a file over the ceiling without sending a byte", async () => {
    const { onUpload } = renderField({ maxSizeBytes: 2 * 1024 * 1024 })

    await userEvent.upload(
      screen.getByLabelText(CTA),
      imageNamed("grande.png", "image/png", 3 * 1024 * 1024),
    )

    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("A imagem passa de 2 MB")
  })

  // Through the dialog a wrong type cannot arrive — the picker honours `accept`, and so does
  // userEvent. A drop does not: dragging a file onto the area bypasses `accept` entirely, which is
  // the whole reason the guard exists rather than trusting the attribute.
  it("refuses a dropped type outside accept without sending a byte", () => {
    const { onUpload } = renderField({ accept: "image/png,image/jpeg" })
    const area = screen.getByLabelText(CTA).parentElement as HTMLElement

    fireEvent.drop(area, { dataTransfer: { files: [imageNamed("arquivo.gif", "image/gif")] } })

    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Formato não aceito")
  })

  it("drops its own refusal once an acceptable file replaces the bad one", async () => {
    const { onUpload } = renderField({ maxSizeBytes: 2 * 1024 * 1024 })
    const input = screen.getByLabelText<HTMLInputElement>(CTA)

    await userEvent.upload(input, imageNamed("grande.png", "image/png", 3 * 1024 * 1024))
    expect(screen.getByRole("alert")).toBeInTheDocument()

    await userEvent.upload(input, imageNamed("ok.png"))

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
    expect(onUpload).toHaveBeenCalledTimes(1)
  })

  it("clears the input after an upload, so picking the same file twice still fires", async () => {
    const { onUpload } = renderField()

    const input = screen.getByLabelText<HTMLInputElement>(CTA)
    await userEvent.upload(input, imageNamed("logo.png"))

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

    const input = screen.getByLabelText<HTMLInputElement>(CTA)
    await userEvent.upload(input, imageNamed("logo.png"))

    await waitFor(() => expect(input.value).toBe(""))
    expect(onChange).not.toHaveBeenCalled()
    expect(input).not.toBeDisabled()
  })

  it("keeps a real file input rather than a div someone can only click", () => {
    renderField()

    const input = screen.getByLabelText(CTA)
    expect(input.tagName).toBe("INPUT")
    expect(input).toHaveAttribute("type", "file")
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,image/webp")
    // sr-only, not hidden: hiding it is what takes it out of the tab order.
    expect(input).toHaveClass("sr-only")
  })

  it("shows the picture the shop has now, with a way to replace it and a way to drop it", async () => {
    const { onChange } = renderField({ value: sampleImage })

    expect(screen.getByAltText("Pré-visualização da logo")).toHaveAttribute("src", sampleImage)
    expect(screen.getByRole("button", { name: "Trocar imagem" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remover imagem" }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("offers nothing to remove while there is no image", () => {
    renderField()

    expect(screen.queryByRole("button", { name: "Remover imagem" })).not.toBeInTheDocument()
    expect(screen.getByText(CTA)).toBeInTheDocument()
  })

  it("leaves the area inert when no upload is wired up", () => {
    renderField({ onUpload: undefined })

    expect(screen.getByLabelText(CTA)).toBeDisabled()
  })

  it("takes no new file while the screen's upload is in flight", () => {
    renderField({ pending: true })

    expect(screen.getByLabelText("Enviando…")).toBeDisabled()
  })

  it("renders the verdict the screen's form handed it", () => {
    renderField({ error: { message: "Informe um endereço válido" } })

    expect(screen.getByRole("alert")).toHaveTextContent("Informe um endereço válido")
    expect(screen.getByLabelText(CTA)).toHaveAttribute("aria-invalid", "true")
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderField({ messages: en, recommendedSize: { width: 1600, height: 838 } })

    expect(screen.getByLabelText("Click or drag the image here")).toBeInTheDocument()
    expect(screen.getByText("Recommended size: 1600 x 838 pixels.")).toBeInTheDocument()
    expect(screen.queryByLabelText(CTA)).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreImageField
        id="store-logo"
        label="Logo da loja"
        hint="Uma imagem quadrada fica melhor."
        previewAlt="Pré-visualização da logo"
        recommendedSize={{ width: 512, height: 512 }}
        value=""
        onChange={vi.fn()}
        onUpload={vi.fn(async () => sampleImage)}
        error={{ message: "Escolha uma imagem" }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
