import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"

import { SettingsEditableRow } from "./settings-editable-row"
import { SettingsRow } from "./settings-row"
import { SettingsSection } from "./settings-section"

const noop = () => {}
const labels = { edit: "Editar", save: "Salvar", saving: "Salvando…", cancel: "Cancelar" }

/** A settings section as a record lays it out: label · value · action. */
function Section() {
  return (
    <div className="max-w-4xl">
      <SettingsSection title="Dados" description="O que só a loja vê.">
        <SettingsRow label="Nome">Maria Souza</SettingsRow>
        <SettingsRow label="E-mail">maria@exemplo.com</SettingsRow>
        <SettingsEditableRow label="Telefone" hint="Com DDD." display="(85) 99999-4321" editing={false} field={null} onEdit={noop} onSave={noop} onCancel={noop} labels={labels} />
        <SettingsRow
          label="Link"
          action={
            <Button type="button" variant="outline" size="sm">
              Copiar
            </Button>
          }
        >
          <span className="font-mono text-[13px]">beelink.biz/mutante-suplementos/maria</span>
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}

const meta = {
  title: "Blocos/Compartilhados/Linhas de configuração",
  component: Section,
} satisfies Meta<typeof Section>

export default meta
type Story = StoryObj<typeof meta>

/** Uma seção com linhas de leitura, uma editável e uma ação. */
export const Secao: Story = {}

/** Uma linha sendo editada no lugar. */
export const Editando: Story = {
  render: () => (
    <div className="max-w-4xl">
      <SettingsSection title="Dados">
        <SettingsEditableRow
          label="CPF"
          hint="Só a loja vê."
          display="529.982.247-25"
          editing
          field={<Input aria-label="CPF" defaultValue="529.982" />}
          issue="Informe um CPF válido."
          onEdit={noop}
          onSave={noop}
          onCancel={noop}
          labels={labels}
        />
      </SettingsSection>
    </div>
  ),
}
