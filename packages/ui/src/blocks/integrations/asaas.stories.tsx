// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { AsaasCardView, PaymentSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"

// Block
import { AsaasCard } from "./asaas-card"
import { ASAAS_LOGO, asaasConnected, asaasDisconnected, payments } from "./integrations.fixtures"
import { IntegrationsResult } from "./integrations-result"
import { PaymentSettingsForm } from "./payment-settings-form"

const noop = () => {}
const NONE_ON = "Deixe pelo menos uma forma ligada: sem nenhuma, o cliente não tem como pagar."

const meta = {
  title: "Blocos/Painel/Integrações/Asaas",
  component: AsaasCard,
  decorators: [(Story) => <div className="max-w-3xl">{Story()}</div>],
  args: { view: asaasConnected, logoSrc: ASAAS_LOGO, onConnect: noop, onDisconnect: noop },
} satisfies Meta<typeof AsaasCard>

export default meta
type Story = StoryObj<typeof meta>

/** Conectado no sandbox: de quem é a conta e os avisos de pagamento ativos. "Trocar a chave" abre o campo. */
export const Conectado: Story = {}

/** A loja que ainda não conectou, numa instalação de sandbox: o campo da chave e o link de criar conta. */
export const NaoConectado: Story = { args: { view: asaasDisconnected } }

/** Em produção não há a nota do ambiente de testes, e o cadastro é no site do Asaas. */
export const NaoConectadoEmProducao: Story = { args: { view: { ...asaasDisconnected, sandbox: false, signUpHref: "https://www.asaas.com" } } }

/** A chave está sendo conferida no Asaas: o campo travado e o botão ocupado. */
export const Conectando: Story = { args: { view: asaasDisconnected, connecting: true } }

/** A recusa em palavras, sob o campo: aqui, uma chave de produção numa instalação de sandbox. */
export const ChaveRecusada: Story = {
  args: { view: asaasDisconnected, connectError: "Essa chave não é do ambiente de testes. Esta instalação só aceita chaves do sandbox do Asaas, que começam com $aact_hmlg_." },
}

/** Os avisos de pagamento fora do normal: não cadastrados em dev, pausados pelo Asaas, e o cadastro que falhou. */
export const AvisosDePagamento: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(["SKIPPED", "PAUSED", "ERROR"] as const).map((webhook) => (
        <AsaasCard key={webhook} {...args} view={{ ...asaasConnected, webhook }} />
      ))}
    </div>
  ),
}

/** O Asaas parou de aceitar a chave: o aviso, a conta que estava ligada e o campo para uma chave nova. */
export const PrecisaReconectar: Story = { args: { view: { ...asaasConnected, status: "NEEDS_RECONNECT", webhook: "REGISTERED" } } }

/** Uma conta de pessoa física, em produção, cujo documento o Asaas não informou. */
export const ContaSemDocumento: Story = { args: { view: { ...asaasConnected, sandbox: false, account: { name: "Maria Lessari", document: null } } } }

/** Sem onde selar a chave nesta instalação: nada para apertar. */
export const Indisponivel: Story = { args: { view: { ...asaasDisconnected, available: false } } }

/** O desconectar que não passou. */
export const DesconectarFalhou: Story = { args: { disconnectError: "Não foi possível desconectar agora. Tente de novo." } }

/** As formas aceitas: um interruptor cada, e as parcelas enquanto o cartão está ligado. */
export const FormasDePagamento: Story = { render: () => <PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} /> }

/** Com o cartão desligado as parcelas saem de vista; o número continua guardado. */
export const FormasSemCartao: Story = { render: () => <PaymentSettingsForm value={{ ...payments, card: false }} onChange={noop} onSubmit={noop} /> }

/** Tudo desligado: a frase que pede pelo menos uma forma, e nada é enviado. */
export const FormasTodasDesligadas: Story = {
  render: () => <PaymentSettingsForm value={{ ...payments, pix: false, card: false, offline: false }} onChange={noop} onSubmit={noop} issue={NONE_ON} />,
}

/** Salvando, salvo, e a recusa da API em palavras. */
export const FormasAoSalvar: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} pending />
      <PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} saved />
      <PaymentSettingsForm value={payments} onChange={noop} onSubmit={noop} error="Alguma escolha está fora do permitido. Confira as formas e o número de parcelas." />
    </div>
  ),
}

/** Enquanto as escolhas são lidas: o mesmo quadro, com as formas no lugar. */
export const FormasCarregando: Story = { render: () => <PaymentSettingsForm value="loading" onChange={noop} onSubmit={noop} /> }

/**
 * A página como a tela a liga: conectar leva um instante, troca o cartão e mostra as formas aceitas;
 * desconectar volta ao começo. O que é digitado no campo não vai a lugar nenhum.
 */
function Live() {
  const [view, setView] = useState<AsaasCardView>(asaasDisconnected)
  const [connecting, setConnecting] = useState(false)
  const [chosen, setChosen] = useState<PaymentSettingsFormValues>(payments)
  const connected = view.status === "CONNECTED"
  const none = !chosen.pix && !chosen.card && !chosen.offline

  function connect() {
    setConnecting(true)
    window.setTimeout(() => {
      setConnecting(false)
      setView({ ...asaasConnected, connectedAt: new Date().toISOString() })
    }, 800)
  }

  return (
    <div className="flex flex-col gap-6">
      {connected ? <IntegrationsResult tone="done" message="Asaas conectado. Escolha abaixo as formas de pagamento da loja." /> : null}
      <AsaasCard view={view} logoSrc={ASAAS_LOGO} onConnect={connect} connecting={connecting} onDisconnect={() => setView(asaasDisconnected)} />
      {connected ? <PaymentSettingsForm value={chosen} onChange={setChosen} onSubmit={noop} issue={none ? NONE_ON : undefined} /> : null}
    </div>
  )
}

export const AoVivo: Story = { render: () => <Live /> }
