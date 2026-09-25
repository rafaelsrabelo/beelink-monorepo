// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductMediaField } from "./product-media-field"

function fileOf(name: string): File {
  return new File(["x"], name, { type: "image/png" })
}

/** Controlled by a form in the app, so a test that adds photos has to hold the list the same way. */
function Controlled({ onUpload }: { onUpload: (file: File) => Promise<string> }) {
  const [urls, setUrls] = useState<string[]>([])

  return <ProductMediaField value={urls} onChange={setUrls} onUpload={onUpload} />
}

describe("ProductMediaField", () => {
  it("takes several files in one gesture", async () => {
    const onUpload = vi.fn(async (file: File) => `https://cdn/${file.name}`)
    render(<Controlled onUpload={onUpload} />)

    await userEvent.upload(screen.getByLabelText("Fotos"), [fileOf("a.png"), fileOf("b.png")])

    expect(onUpload).toHaveBeenCalledTimes(2)
    expect(await screen.findAllByRole("img")).toHaveLength(2)
  })

  /*
    Sequential, not parallel. Four files at once is four bodies leaving a phone on mobile data, and
    the order they finish in decides which photo becomes the card's — so racing them would make the
    cover depend on the network.
  */
  it("uploads one after another, so the first photo is the first file", async () => {
    const order: string[] = []
    const onUpload = vi.fn(async (file: File) => {
      order.push(file.name)
      return `https://cdn/${file.name}`
    })
    render(<Controlled onUpload={onUpload} />)

    await userEvent.upload(screen.getByLabelText("Fotos"), [fileOf("a.png"), fileOf("b.png")])

    expect(order).toEqual(["a.png", "b.png"])
  })

  it("marks the first as the one the shop window shows", () => {
    render(
      <ProductMediaField
        value={["https://cdn/a.png", "https://cdn/b.png"]}
        onChange={() => {}}
        onUpload={async () => ""}
      />,
    )

    expect(screen.getByText("Capa")).toBeInTheDocument()
  })

  it("removes the photo that was asked for, and no other", async () => {
    const onChange = vi.fn()
    render(
      <ProductMediaField
        value={["https://cdn/a.png", "https://cdn/b.png"]}
        onChange={onChange}
        onUpload={async () => ""}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Remover foto 2" }))

    expect(onChange).toHaveBeenCalledWith(["https://cdn/a.png"])
  })

  it("reorders, which is how the cover is chosen without a separate control", async () => {
    const onChange = vi.fn()
    render(
      <ProductMediaField
        value={["https://cdn/a.png", "https://cdn/b.png"]}
        onChange={onChange}
        onUpload={async () => ""}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Mover para antes da foto 2" }))

    expect(onChange).toHaveBeenCalledWith(["https://cdn/b.png", "https://cdn/a.png"])
  })

  it("refuses the same file twice, which dropping a folder again would send", async () => {
    const onChange = vi.fn()
    render(
      <ProductMediaField
        value={["https://cdn/a.png"]}
        onChange={onChange}
        onUpload={async () => "https://cdn/a.png"}
      />,
    )

    await userEvent.upload(screen.getByLabelText("Fotos"), fileOf("a.png"))

    expect(onChange).toHaveBeenCalledWith(["https://cdn/a.png"])
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ProductMediaField
        value={["https://cdn/a.png"]}
        onChange={() => {}}
        onUpload={async () => ""}
      />,
    )

    await expectNoA11yViolations(container)
  })

  it("draws what it is given under each photo, and keeps the photo's own controls on it", () => {
    render(
      <ProductMediaField
        value={["https://cdn/a.png", "https://cdn/b.png"]}
        onChange={() => {}}
        onUpload={async () => ""}
        photoFooter={(url, index) => <span>{`legenda ${index + 1} ${url}`}</span>}
      />,
    )

    expect(screen.getByText("legenda 2 https://cdn/b.png")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remover foto 2" })).toBeInTheDocument()
  })
})
