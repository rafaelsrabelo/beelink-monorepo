// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CategoryList, type CategoryListItem } from "./category-list"

const categories: CategoryListItem[] = [
  { id: "1", slug: "proteinas", name: "Proteínas", imageUrl: null, parentSlug: null, productCount: 3, isActive: true },
  { id: "2", slug: "whey", name: "Whey", imageUrl: "https://cdn/w.png", parentSlug: "proteinas", productCount: 2, isActive: true },
  { id: "3", slug: "albumina", name: "Albumina", imageUrl: null, parentSlug: "proteinas", productCount: 1, isActive: false },
  { id: "4", slug: "creatina", name: "Creatina", imageUrl: null, parentSlug: null, productCount: 0, isActive: true },
]

function renderList(overrides: Partial<Parameters<typeof CategoryList>[0]> = {}) {
  return render(<CategoryList categories={categories} onEdit={() => {}} onDelete={() => {}} {...overrides} />)
}

describe("CategoryList", () => {
  /** The nesting is the thing being edited, so it has to be visible as nesting. */
  it("puts a subcategory inside its parent's row", () => {
    const { container } = renderList()

    const tops = container.querySelectorAll(":scope > ul > li")
    expect(tops).toHaveLength(2)
    expect(within(tops[0] as HTMLElement).getByText("Whey")).toBeInTheDocument()
    expect(within(tops[0] as HTMLElement).getByText("Albumina")).toBeInTheDocument()
  })

  /**
   * This is the screen where a hidden category is turned back on, so it has to be here — and it has
   * to look different, because a row invisible to customers that looks like every other row is
   * found out by a phone call asking where the page went.
   */
  it("shows the hidden ones, marked", () => {
    renderList()

    const albumina = screen.getByText("Albumina").closest("li")
    expect(within(albumina as HTMLElement).getByText("Escondida")).toBeInTheDocument()
  })

  it("keeps an empty category listed, because emptiness is what you fix here", () => {
    renderList()

    const creatina = screen.getByText("Creatina").closest("li")
    expect(within(creatina as HTMLElement).getByText("0 produtos")).toBeInTheDocument()
  })

  /** Two icon buttons a row: without a name each one announces as "button" and nothing else. */
  it("names every action after the category it acts on", async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    renderList({ onEdit })

    await user.click(screen.getByRole("button", { name: "Editar categoria: Whey" }))

    expect(onEdit).toHaveBeenCalledWith("2")
  })

  /**
   * A subcategory whose parent is missing should not happen — the API answers the whole shop — but
   * a row that silently vanishes is the worst possible way to discover that it did.
   */
  it("still draws a subcategory whose parent is not in the list", () => {
    renderList({
      categories: [
        { id: "9", slug: "orfa", name: "Órfã", imageUrl: null, parentSlug: "sumiu", productCount: 1, isActive: true },
      ],
    })

    expect(screen.getByText("Órfã")).toBeInTheDocument()
  })

  it("says what to do when there is nothing yet", () => {
    renderList({ categories: [] })

    expect(screen.getByText("Nenhuma categoria ainda.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList()

    await expectNoA11yViolations(container)
  })
})
