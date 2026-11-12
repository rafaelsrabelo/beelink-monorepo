// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import { Input } from "@harness-monorepo/ui/components/input"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SettingsEditableRow } from "./settings-editable-row"
import { SettingsRow } from "./settings-row"
import { SettingsSection } from "./settings-section"

const labels = { edit: "Editar", save: "Salvar", saving: "Salvando…", cancel: "Cancelar" }

describe("settings rows (12/11/2026)", () => {
  it("lays a section out as label · value · action rows", async () => {
    const { container } = render(
      <SettingsSection title="Dados" description="Só a loja vê.">
        <SettingsRow label="Nome">Maria Souza</SettingsRow>
        <SettingsRow label="Telefone" hint="Com DDD." action={<button type="button">Copiar</button>}>
          (85) 99999-4321
        </SettingsRow>
      </SettingsSection>,
    )

    expect(screen.getByRole("heading", { name: "Dados" })).toBeInTheDocument()
    expect(screen.getByText("Com DDD.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("edits a value in place, saving with Enter and cancelling back", async () => {
    const onEdit = vi.fn()
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const field = <Input aria-label="Telefone" defaultValue="(85) 9" />
    const { container, rerender } = render(<SettingsEditableRow label="Telefone" display="(85) 99999-4321" editing={false} field={field} onEdit={onEdit} onSave={onSave} onCancel={onCancel} labels={labels} />)

    await userEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(onEdit).toHaveBeenCalled()

    rerender(<SettingsEditableRow label="Telefone" display="(85) 99999-4321" editing field={field} onEdit={onEdit} onSave={onSave} onCancel={onCancel} issue="Informe um telefone com DDD." labels={labels} />)
    await userEvent.type(screen.getByLabelText("Telefone"), "{Enter}")
    expect(onSave).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um telefone com DDD.")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("names a control by its row's label", () => {
    render(
      <SettingsRow label="Tabela" htmlFor="tabela">
        <select id="tabela">
          <option>Padrão</option>
        </select>
      </SettingsRow>,
    )
    expect(screen.getByLabelText("Tabela")).toBeInTheDocument()
  })
})
