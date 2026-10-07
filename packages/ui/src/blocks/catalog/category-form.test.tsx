// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CategoryForm, type CategoryFormValues } from "./category-form"

const value: CategoryFormValues = {
  name: "Ferramentas",
  slug: "ferramentas",
  description: "",
  imageUrl: "",
  bannerUrl: "",
  parentId: "",
  isActive: true,
}

function renderForm(over: Partial<Parameters<typeof CategoryForm>[0]> = {}) {
  const onChange = vi.fn()
  const view = render(
    <CategoryForm
      value={value}
      onChange={onChange}
      parents={[{ id: "p1", name: "Casa" }]}
      shopSlug="lessari"
      onUploadImage={vi.fn()}
      onUploadBanner={vi.fn()}
      onSubmit={vi.fn()}
      {...over}
    />,
  )
  return { ...view, onChange }
}

const bannerField = () => screen.getByRole("group", { name: "Banner da página" })

describe("CategoryForm — the page's banner (BEELINK-307)", () => {
  it("asks for a wide banner apart from the card's image, and says the size to make", () => {
    renderForm()

    expect(within(bannerField()).getByText("Dimensão recomendada: 1600 x 400 pixels.")).toBeInTheDocument()
    expect(
      within(bannerField()).getByText(
        "Uma imagem larga no topo da página da categoria, acima do título. Aparece na mesma proporção no computador e no celular.",
      ),
    ).toBeInTheDocument()
    // The card's image keeps its own field and its own size.
    expect(within(screen.getByRole("group", { name: "Imagem" })).getByText("Dimensão recomendada: 600 x 600 pixels.")).toBeInTheDocument()
  })

  it("says, on a subcategory, that with none of its own it shows its parent's", () => {
    renderForm({ value: { ...value, parentId: "p1" } })

    expect(within(bannerField()).getByText(/Sem banner próprio, a subcategoria mostra o da categoria em que está\./)).toBeInTheDocument()
  })

  it("sends a picked file through the banner's own upload, and keeps the address it answers", async () => {
    const user = userEvent.setup()
    const onUploadBanner = vi.fn(async () => "https://cdn.example/banners/ferramentas.png")
    const onUploadImage = vi.fn()
    const { onChange, container } = renderForm({ onUploadBanner, onUploadImage })

    const file = new File(["x"], "banner.png", { type: "image/png" })
    await user.upload(container.querySelector<HTMLInputElement>("#category-banner-file")!, file)

    expect(onUploadBanner).toHaveBeenCalledWith(file)
    expect(onUploadImage).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({ ...value, bannerUrl: "https://cdn.example/banners/ferramentas.png" })
  })

  it("shows the banner it has in the page's own proportion, and clears it alone", async () => {
    const user = userEvent.setup()
    const held = { ...value, imageUrl: "https://cdn.example/card.png", bannerUrl: "https://cdn.example/banner.png" }
    const { onChange } = renderForm({ value: held })

    const preview = within(bannerField()).getByRole("img", { name: "Banner da página" })
    expect(preview).toHaveAttribute("src", "https://cdn.example/banner.png")
    expect(preview.style.aspectRatio).toBe("1600 / 400")

    await user.click(within(bannerField()).getByRole("button", { name: "Remover imagem" }))
    expect(onChange).toHaveBeenCalledWith({ ...held, bannerUrl: "" })
  })

  it("has no accessibility violations", async () => {
    const { container } = renderForm({ value: { ...value, bannerUrl: "https://cdn.example/banner.png" } })

    await expectNoA11yViolations(container)
  })
})
