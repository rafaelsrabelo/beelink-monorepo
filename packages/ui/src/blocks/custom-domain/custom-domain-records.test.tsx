// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TARGET_IP } from "./custom-domain.fixtures"
import { CustomDomainRecords } from "./custom-domain-records"

const SECOND_IP = "203.0.113.11"

const table = () => screen.getByRole("table", { name: "Registros de DNS do domínio" })
/** The rows under the header, each as the words of its cells. */
const rows = () => within(table()).getAllByRole("row").slice(1)
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell")

describe("CustomDomainRecords (BEELINK-285)", () => {
  it("lists an A on the root for the server's address and www as a CNAME of the root, under what each column is", async () => {
    const { container } = render(<CustomDomainRecords targetIps={[TARGET_IP]} />)

    expect(screen.getByRole("region", { name: "O que configurar no seu provedor" })).toBeInTheDocument()
    expect(within(table()).getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Tipo", "Nome", "Valor"])
    expect(rows()).toHaveLength(2)
    const [a, cname] = rows().map(cellsOf)
    expect([a?.[0]?.textContent, a?.[1]?.textContent]).toEqual(["A", "@"])
    expect(within(a![2]!).getByText(TARGET_IP)).toBeInTheDocument()
    expect([cname?.[0]?.textContent, cname?.[1]?.textContent]).toEqual(["CNAME", "www"])
    expect(within(cname![2]!).getByText("@")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("has a row for each address the server answers on", () => {
    render(<CustomDomainRecords targetIps={[TARGET_IP, SECOND_IP]} />)

    expect(rows().map((row) => cellsOf(row)[0]?.textContent)).toEqual(["A", "A", "CNAME"])
    expect(screen.getByText(SECOND_IP)).toBeInTheDocument()
  })

  it("says where the records are created, how long they take, and what else gets in the way", () => {
    render(<CustomDomainRecords targetIps={[TARGET_IP]} />)

    expect(screen.getByText(/na parte de DNS do painel de onde o domínio foi comprado \(GoDaddy, Registro\.br, Hostinger…\)/)).toBeInTheDocument()
    const notes = within(screen.getByRole("list")).getAllByRole("listitem").map((note) => note.textContent)
    expect(notes).toHaveLength(5)
    expect(notes[0]).toMatch(/de alguns minutos a algumas horas/)
    expect(notes[1]).toMatch(/encaminhamento \(redirecionamento\) ligado, remova/)
    expect(notes[2]).toMatch(/só o registro A desta tabela/)
    expect(notes[3]).toMatch(/A raiz do domínio \(@\) não aceita CNAME, por isso ela usa um registro A/)
    expect(notes[4]).toMatch(/não aceitar @ como valor do CNAME, coloque o próprio domínio/)
  })

  /**
   * Seen in the browser at 390px: side by side, an address and its button are wider than the card,
   * and the button was cut at the card's edge. Below `sm` the button goes under its value.
   */
  it("stacks each value over its button at a phone's width, and sets them side by side from sm up", () => {
    render(<CustomDomainRecords targetIps={[TARGET_IP]} />)

    for (const button of screen.getAllByRole("button", { name: "Copiar" })) {
      expect(button.parentElement).toHaveClass("flex-col", "items-start", "sm:flex-row", "sm:items-center", "sm:justify-between")
    }
  })

  /** A value typed by hand into a provider's panel is where a domain goes wrong: each has its own button. */
  it("copies each value with its own button, named for the value beside it, and says it did", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<CustomDomainRecords targetIps={[TARGET_IP]} />)

    const [copyAddress, copyRoot] = screen.getAllByRole("button", { name: "Copiar" })
    expect(copyAddress).toHaveAccessibleDescription(TARGET_IP)
    expect(copyRoot).toHaveAccessibleDescription("@")

    await user.click(copyAddress!)
    expect(writeText).toHaveBeenCalledExactlyOnceWith(TARGET_IP)
    await waitFor(() => expect(within(rows()[0]!).getByRole("button", { name: "Copiado" })).toBeInTheDocument())
    // The other row's button did nothing, and says so.
    expect(within(rows()[1]!).getByRole("button", { name: "Copiar" })).toBeInTheDocument()

    await user.click(copyRoot!)
    expect(writeText).toHaveBeenLastCalledWith("@")
  })

  /** No clipboard, or one that refuses: the value is selected to be copied by hand, and the button says so. */
  it("selects the value when the clipboard refuses, and says so", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) }, configurable: true })
    render(<CustomDomainRecords targetIps={[TARGET_IP]} />)

    await user.click(screen.getAllByRole("button", { name: "Copiar" })[0]!)

    await waitFor(() => expect(screen.getByRole("button", { name: "Valor selecionado" })).toBeInTheDocument())
    expect(window.getSelection()?.toString()).toBe(TARGET_IP)
  })

  it("selects the value in a browser with no clipboard at all", async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
    render(<CustomDomainRecords targetIps={[TARGET_IP]} />)

    await user.click(screen.getAllByRole("button", { name: "Copiar" })[1]!)

    await waitFor(() => expect(screen.getByRole("button", { name: "Valor selecionado" })).toBeInTheDocument())
    expect(window.getSelection()?.toString()).toBe("@")
  })

  it("reads in another language when handed one", () => {
    render(<CustomDomainRecords targetIps={[TARGET_IP]} messages={en} />)

    expect(screen.getByRole("region", { name: "What to set up at your provider" })).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "The domain's DNS records" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Copy" })).toHaveLength(2)
  })
})
