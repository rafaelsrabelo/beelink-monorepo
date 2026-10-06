// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { MetaPixelCardView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { META_LOGO, metaPixelConnected, metaPixelDisconnected } from "./integrations.fixtures"
import { MetaPixelCard, type MetaPixelCardProps } from "./meta-pixel-card"

const ID = "987654321098765"

function show(view: MetaPixelCardView, props: Partial<MetaPixelCardProps> = {}) {
  const onConnect = vi.fn()
  const onDisconnect = vi.fn()
  const result = render(<MetaPixelCard view={view} logoSrc={META_LOGO} onConnect={onConnect} onDisconnect={onDisconnect} {...props} />)
  const again = (next: MetaPixelCardView, more: Partial<MetaPixelCardProps> = {}) => result.rerender(<MetaPixelCard view={next} logoSrc={META_LOGO} onConnect={onConnect} onDisconnect={onDisconnect} {...props} {...more} />)
  return { ...result, again, onConnect, onDisconnect }
}

const card = () => screen.getByRole("region", { name: "Pixel da Meta" })

describe("MetaPixelCard, for a shop yet to give its pixel", () => {
  it("says what a pixel is for under Meta's mark, is not connected, and takes the ID", async () => {
    const { container, onConnect } = show(metaPixelDisconnected)

    expect(container.querySelector("img")).toHaveAttribute("src", META_LOGO)
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    expect(within(card()).getByText("Não conectado")).toHaveAttribute("data-variant", "outline")
    expect(within(card()).queryByText("Conectado")).toBeNull()
    expect(within(card()).getByText(/serve para a Meta medir as visitas e as compras/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Desconectar" })).toBeNull()

    await userEvent.type(screen.getByLabelText("ID do pixel"), ID)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(ID)
    await expectNoA11yViolations(container)
  })

  it("locks the field while the ID is saved, and says the API's refusal under it", () => {
    const { again } = show(metaPixelDisconnected, { connecting: true })
    expect(screen.getByLabelText("ID do pixel")).toBeDisabled()

    again(metaPixelDisconnected, { connecting: false, connectError: "Não foi possível salvar o ID agora. Tente de novo." })
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar o ID agora. Tente de novo.")
  })

  it("titles its own page, and speaks the language it is handed", () => {
    show(metaPixelDisconnected, { headingAs: "h1", messages: en })

    expect(screen.getByRole("heading", { level: 1, name: "Meta Pixel" })).toBeInTheDocument()
    expect(screen.getByText("Not connected")).toBeInTheDocument()
  })
})

describe("MetaPixelCard, connected", () => {
  it("is connected in green, and says which ID is saved and when", async () => {
    const { container } = show(metaPixelConnected)

    expect(within(card()).getByText("Conectado")).toHaveAttribute("data-variant", "success")
    expect(screen.getByText("ID do pixel").nextElementSibling).toHaveTextContent(/^123456789012345$/)
    expect(screen.getByText("Salvo em").nextElementSibling).toHaveTextContent(/^06\/10\/2026$/)
    // No field until one is asked for: the ID is there.
    expect(screen.queryByRole("textbox")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("changes the ID with the same field, sends the new one, and can be left without sending anything", async () => {
    const onReplaceCancel = vi.fn()
    const { onConnect } = show(metaPixelConnected, { onReplaceCancel })

    await userEvent.click(screen.getByRole("button", { name: "Trocar o ID" }))
    const replacement = screen.getByLabelText("Novo ID do pixel")
    // The field arrives with the focus: it is what the button was pressed for.
    expect(replacement).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Desconectar" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByLabelText("Novo ID do pixel")).toBeNull()
    expect(onReplaceCancel).toHaveBeenCalledOnce()
    expect(onConnect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Trocar o ID" }))
    await userEvent.type(screen.getByLabelText("Novo ID do pixel"), ID)
    await userEvent.click(screen.getByRole("button", { name: "Salvar o novo ID" }))
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(ID)
  })

  /** The form was opened on one connection: the ID that replaced it is another, and has no form open. */
  it("closes the field once another ID took the place of the one it was opened on", async () => {
    const { again } = show(metaPixelConnected)
    await userEvent.click(screen.getByRole("button", { name: "Trocar o ID" }))

    again({ pixelId: ID, connectedAt: "2026-10-07T09:00:00.000Z", savedAt: "07/10/2026" })

    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.getByText("ID do pixel").nextElementSibling).toHaveTextContent(ID)
    expect(screen.getByRole("button", { name: "Trocar o ID" })).toBeInTheDocument()
  })

  it("asks before disconnecting, saying that nothing changes at Meta, and keeps the pixel when told to", async () => {
    const { onDisconnect } = show(metaPixelConnected)

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Desconectar o Pixel da Meta?" })
    expect(dialog).toHaveTextContent(ptBR.integrations.metaPixel.disconnectBody)
    expect(dialog).toHaveTextContent(/Nada muda na sua conta da Meta/)

    await userEvent.click(within(dialog).getByRole("button", { name: "Manter conectado" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(onDisconnect).not.toHaveBeenCalled()
  })

  it("disconnects once it is confirmed", async () => {
    const { onDisconnect } = show(metaPixelConnected)

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Desconectar" }))

    expect(onDisconnect).toHaveBeenCalledOnce()
  })

  it("locks both ways out while it disconnects, and says a disconnect that did not go through", () => {
    const { again } = show(metaPixelConnected, { disconnecting: true })
    expect(screen.getByRole("button", { name: "Trocar o ID" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDisabled()

    again(metaPixelConnected, { disconnecting: false, disconnectError: "Não foi possível desconectar agora. Tente de novo." })
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível desconectar agora. Tente de novo.")
  })
})
