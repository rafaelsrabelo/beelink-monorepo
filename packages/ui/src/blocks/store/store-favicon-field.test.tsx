// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreFaviconField } from "./store-favicon-field"

const stored = "https://cdn.exemplo.com/icone.png"
const logo = "https://cdn.exemplo.com/logo.png"
const CTA = "Clique ou arraste o ícone aqui"
const png = (name: string) => new File(["bytes"], name, { type: "image/png" })

/** What the browser says the picked image measures. */
function measuring(width: number, height: number) {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width, height, close: () => undefined })))
}

function renderField(overrides: Partial<Parameters<typeof StoreFaviconField>[0]> = {}) {
  const onChange = vi.fn()
  const onUpload = vi.fn(async () => stored)
  render(<StoreFaviconField value="" onChange={onChange} logoUrl="" storeName="Doces da Ana" onUpload={onUpload} {...overrides} />)
  return { onChange, onUpload }
}

describe("StoreFaviconField", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("says what the icon is, what works best, and that the logo stands in for it", () => {
    renderField()

    expect(screen.getByText("Ícone do navegador")).toBeInTheDocument()
    expect(screen.getByText(/aparece na aba do navegador.*quadrada e simples.*Sem ela, a loja usa a logo\./)).toBeInTheDocument()
    expect(screen.getByText("Formatos aceitos: PNG, JPEG ou WebP de até 2 MB.")).toBeInTheDocument()
  })

  it("sends a square image and hands back the address it was stored at", async () => {
    measuring(512, 512)
    const { onChange, onUpload } = renderField()

    const file = png("icone.png")
    await userEvent.upload(screen.getByLabelText(CTA), file)

    expect(onUpload).toHaveBeenCalledWith(file)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(stored))
  })

  it("refuses an image that is not square before a byte is sent, with its measures in the sentence", async () => {
    measuring(600, 200)
    const { onChange, onUpload } = renderField()

    await userEvent.upload(screen.getByLabelText(CTA), png("logo-larga.png"))

    expect(await screen.findByRole("alert")).toHaveTextContent("O ícone precisa ser quadrado. A imagem enviada tem 600 x 200 pixels.")
    expect(onUpload).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("lets through an image the browser could not measure: no verdict is not a refusal", async () => {
    vi.stubGlobal("createImageBitmap", undefined)
    const { onUpload } = renderField()

    await userEvent.upload(screen.getByLabelText(CTA), png("icone.png"))

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1))
  })

  it("shows the icon it has in the tab's preview, and lets it be replaced or removed", async () => {
    const { onChange } = renderField({ value: stored, logoUrl: logo })

    expect(screen.getByTestId("favicon-preview-image")).toHaveAttribute("src", stored)
    expect(screen.getByRole("img", { name: "Pré-visualização do ícone do navegador" })).toHaveAttribute("src", stored)
    expect(screen.getByRole("button", { name: "Trocar ícone" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remover ícone" }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("shows the logo in the tab while there is no icon", () => {
    renderField({ logoUrl: logo })

    expect(screen.getByTestId("favicon-preview-image")).toHaveAttribute("src", logo)
    expect(screen.getByText("Sem ícone, a aba mostra a logo da loja.")).toBeInTheDocument()
  })

  it("renders the verdict the screen handed it, and speaks English when handed it", () => {
    renderField({ error: { message: "Enter an address starting with https://" }, messages: en })

    expect(screen.getByRole("alert")).toHaveTextContent("Enter an address starting with https://")
    expect(screen.getByText("Browser icon")).toBeInTheDocument()
    expect(screen.getByLabelText("Click or drag the icon here")).toBeInTheDocument()
  })

  it("has no accessibility violations, empty or holding an icon", async () => {
    const { container, rerender } = render(<StoreFaviconField value="" onChange={vi.fn()} logoUrl="" storeName="Doces da Ana" onUpload={vi.fn()} />)
    await expectNoA11yViolations(container)

    rerender(<StoreFaviconField value={stored} onChange={vi.fn()} logoUrl={logo} storeName="Doces da Ana" onUpload={vi.fn()} />)
    await expectNoA11yViolations(container)
  })
})
