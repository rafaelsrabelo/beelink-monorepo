// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSearchScopeSelect, type StorefrontSearchScopeSelectProps } from "./storefront-search-scope"

const LONG = "Suplementos para academia, treino funcional e corrida de rua!" // 60 characters and one more
const scopes = [
  { value: "whey", label: "Whey" },
  { value: "longa", label: LONG },
]

function scope(props: Partial<StorefrontSearchScopeSelectProps> = {}) {
  const sent = vi.fn<(data: Record<string, FormDataEntryValue>) => void>()
  const view = render(
    <form
      onSubmit={(event) => {
        event.preventDefault()
        sent(Object.fromEntries(new FormData(event.currentTarget)))
      }}
    >
      <StorefrontSearchScopeSelect scopes={scopes} {...props} />
      <input name="q" aria-label="Buscar nesta loja" defaultValue="creatina" />
      <button type="submit">Buscar</button>
    </form>,
  )
  return { ...view, sent, user: userEvent.setup() }
}
const button = () => screen.getByRole("combobox", { name: "Buscar em" })
const field = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="hidden"][name="categoria"]')

describe("StorefrontSearchScopeSelect", () => {
  it("is a button named for what it does, showing the whole shop until a category is chosen", () => {
    const { container } = scope()

    expect(button().tagName).toBe("BUTTON")
    expect(button()).toHaveTextContent("Todos")
    expect(button()).toHaveAttribute("title", "Todos")
    // No native select: one is as wide as its longest option, whatever it is showing.
    expect(container.querySelector("select:not([aria-hidden='true'])")).toBeNull()
  })

  // The complaint: "Todos" drawn 160px wide because another category has a long name.
  it("takes the room of the chosen name alone, up to a small cap, and never a fixed width", () => {
    scope()

    expect(button()).toHaveClass("w-fit", "max-w-[7rem]", "shrink-0", "h-full")
    expect(button().className).not.toMatch(/(^|\s)(w-\[|w-\d|min-w-\[|shop-md:max-w-)/)
  })

  it("with a 60-character category chosen, keeps the cap, cuts the name and says it whole in its title", () => {
    scope({ value: "longa" })

    expect(LONG.length).toBeGreaterThanOrEqual(60)
    expect(button()).toHaveClass("max-w-[7rem]")
    expect(button()).toHaveAttribute("title", LONG)
    expect(within(button()).getByText(LONG)).toHaveClass("truncate", "min-w-0")
  })

  it("sends the chosen category as `categoria` with the form, and nothing chosen as an empty one — the address the native select made", async () => {
    const all = scope()
    expect(field(all.container)).toHaveValue("")
    await all.user.click(screen.getByRole("button", { name: "Buscar" }))
    expect(all.sent).toHaveBeenLastCalledWith({ categoria: "", q: "creatina" })
    all.unmount()

    const chosen = scope({ value: "whey" })
    expect(field(chosen.container)).toHaveValue("whey")
    await chosen.user.click(screen.getByRole("button", { name: "Buscar" }))
    expect(chosen.sent).toHaveBeenLastCalledWith({ categoria: "whey", q: "creatina" })
    // One field under that key, and no more: the primitive adds none of its own.
    expect(chosen.container.querySelectorAll('[name="categoria"]')).toHaveLength(1)
  })

  it("opens a list with the whole shop first and every category's whole name, and takes the one picked", async () => {
    const { user, container } = scope()

    await user.click(button())
    const list = await screen.findByRole("listbox")
    expect(within(list).getAllByRole("option").map((option) => option.textContent)).toEqual(["Todos", "Whey", LONG])
    // Never wider than the screen, and a long name wraps instead of being cut.
    expect(list.closest("[data-slot=select-content]")).toHaveClass("max-w-[min(20rem,calc(100vw-2rem))]")
    expect(within(list).getByRole("option", { name: LONG })).toHaveClass("[&>*:first-child]:whitespace-normal")

    await user.click(within(list).getByRole("option", { name: "Whey" }))
    expect(button()).toHaveTextContent("Whey")
    expect(button()).toHaveAttribute("title", "Whey")
    expect(field(container)).toHaveValue("whey")
  })

  it("is used by the keyboard alone: opened, walked and chosen without a pointer", async () => {
    const { user, container } = scope()

    await user.tab()
    expect(button()).toHaveFocus()
    await user.keyboard("{Enter}")
    await screen.findByRole("listbox")
    await user.keyboard("{ArrowDown}{Enter}")

    expect(field(container)).toHaveValue("whey")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("tells the screen what was picked, and goes back to the whole shop as an empty scope", async () => {
    const onValueChange = vi.fn()
    const { user } = scope({ value: "whey", onValueChange })

    await user.click(button())
    await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Todos" }))
    expect(onValueChange).toHaveBeenLastCalledWith("")
  })

  it("follows the screen when the screen holds the scope", () => {
    const { rerender, container } = scope({ value: "whey", onValueChange: () => {} })

    rerender(
      <form>
        <StorefrontSearchScopeSelect scopes={scopes} value="longa" onValueChange={() => {}} />
      </form>,
    )
    expect(field(container)).toHaveValue("longa")
    expect(button()).toHaveAttribute("title", LONG)
  })

  it("wears the shop's tokens and names no colour", async () => {
    const { user } = scope()

    expect(button()).toHaveClass("bg-shop-fill", "text-shop-on-background", "border-shop-frame")
    await user.click(button())
    const list = (await screen.findByRole("listbox")).closest("[data-slot=select-content]") as HTMLElement
    expect(list).toHaveClass("bg-shop-background", "text-shop-on-background")
    expect(document.body.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i)
  })

  it("is named in the screen's language", () => {
    scope({ messages: en })

    expect(screen.getByRole("combobox", { name: "Search in" })).toHaveTextContent("Everything")
  })

  it("has no accessibility violations, closed and open", async () => {
    const { user, container } = scope({ value: "longa" })
    await expectNoA11yViolations(container)

    await user.click(button())
    const list = (await screen.findByRole("listbox")).closest("[data-slot=select-content]") as HTMLElement
    // The list is drawn in a portal: checked where it is, and the form again with it open.
    await expectNoA11yViolations(list)
    await expectNoA11yViolations(container)
  })
})
