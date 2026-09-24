// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// UI
import { CommandDialog } from "./command"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./dialog"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "./pagination"
import { Slider } from "./slider"

/** What the catalogue screens rely on these primitives to let them say, in the shop's language. */
describe("primitives the catalogue screens name", () => {
  it("names each thumb of a range, with no English added to its value", () => {
    const { container } = render(
      <Slider
        defaultValue={[50, 200]}
        max={300}
        getAriaLabel={(index) => (index === 0 ? "Preço mínimo" : "Preço máximo")}
      />
    )

    // Base UI keeps each thumb's range input visually hidden, which jsdom reads as inaccessible,
    // so the name is read from the attribute rather than through the accessibility tree.
    const [low, high] = container.querySelectorAll('input[type="range"]')
    expect(low).toHaveAttribute("aria-label", "Preço mínimo")
    expect(high).toHaveAttribute("aria-label", "Preço máximo")
    expect(low).toHaveAttribute("aria-valuetext", "50")
  })

  it("draws one thumb for one value", () => {
    const { container } = render(<Slider defaultValue={30} getAriaLabel={() => "Volume"} />)

    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(1)
  })

  it("keeps a page number a link, and takes the app's own link component", () => {
    function AppLink(props: React.ComponentProps<"a">) {
      return <a data-app-link="" {...props} />
    }

    render(
      <Pagination aria-label="Páginas">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="?pagina=2" isActive render={<AppLink />}>
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )

    const link = screen.getByRole("link", { name: "2" })
    expect(link).toHaveAttribute("aria-current", "page")
    expect(link).toHaveAttribute("data-app-link")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("says the dialog footer's close button in the language passed in", () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Avise-me</DialogTitle>
          <DialogFooter showCloseButton closeLabel="Fechar" />
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument()
  })

  it("names a command dialog's close button, and holds its title only while open", async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <CommandDialog open={false} title="Buscar opção" closeLabel="Fechar" showCloseButton>
        <div />
      </CommandDialog>
    )
    expect(screen.queryByText("Buscar opção")).toBeNull()

    rerender(
      <CommandDialog open title="Buscar opção" closeLabel="Fechar" showCloseButton>
        <div />
      </CommandDialog>
    )
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Buscar opção")
    await user.keyboard("{Tab}")
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument()
  })
})
