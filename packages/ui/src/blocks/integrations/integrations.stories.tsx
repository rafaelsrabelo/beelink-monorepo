import type { Meta, StoryObj } from "@storybook/react-vite"

import { IntegrationCatalog } from "./integration-catalog"
import { IntegrationList } from "./integration-list"
import { IntegrationsFailed } from "./integrations-failed"
import { IntegrationsResult } from "./integrations-result"
import { IntegrationsSkeleton } from "./integrations-skeleton"
import { asaasOption, asaasRow, connected, melhorEnvioOption, melhorEnvioRow, services, shipping } from "./integrations.fixtures"
import { MelhorEnvioCard } from "./melhor-envio-card"
import { ShippingSettingsForm } from "./shipping-settings-form"

const noop = () => {}
const CONNECT = "#conectar"

/** The panel's Integrations page as the web composes it: the Melhor Envio card over the carrier settings. */
function IntegrationsScreen() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <IntegrationsResult tone="done" message="Melhor Envio conectado. Escolha abaixo como a loja envia." />
      <MelhorEnvioCard view={connected} connectHref={CONNECT} onDisconnect={noop} />
      <ShippingSettingsForm value={shipping} onChange={noop} onSubmit={noop} services={services} />
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Integrações",
  component: IntegrationsScreen,
} satisfies Meta<typeof IntegrationsScreen>

export default meta
type Story = StoryObj<typeof meta>

/** Conectado no sandbox, com o saldo e as escolhas de envio. */
export const Conectado: Story = {}

/** A loja que ainda não conectou: o cartão explica e oferece conectar. */
export const NaoConectado: Story = {
  render: () => (
    <div className="max-w-3xl">
      <MelhorEnvioCard view={{ ...connected, status: "DISCONNECTED", account: null }} connectHref={CONNECT} onDisconnect={noop} />
    </div>
  ),
}

/** O Melhor Envio recusou a renovação: o aviso e o "Conectar de novo". */
export const PrecisaReconectar: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <IntegrationsResult tone="failed" message="O Melhor Envio recusou a autorização. Tente conectar de novo." />
      <MelhorEnvioCard view={{ ...connected, status: "NEEDS_RECONNECT", wallet: { state: "failed" } }} connectHref={CONNECT} onDisconnect={noop} />
    </div>
  ),
}

/** Sem o app configurado na instalação: nada para apertar. */
export const Indisponivel: Story = {
  render: () => (
    <div className="max-w-3xl">
      <MelhorEnvioCard view={{ ...connected, available: false, status: "DISCONNECTED", account: null }} connectHref={CONNECT} onDisconnect={noop} />
    </div>
  ),
}

/** As escolhas com os campos recusados e a resposta da API. */
export const EscolhasRecusadas: Story = {
  render: () => (
    <div className="max-w-3xl">
      <ShippingSettingsForm
        value={{ ...shipping, handlingDays: "45", height: "" }}
        onChange={noop}
        onSubmit={noop}
        services={services}
        issues={{ handlingDays: "Informe de 0 a 30 dias.", package: "Preencha o peso e as três medidas, ou deixe os quatro vazios." }}
        error="Alguma escolha está fora do permitido. Confira os campos."
      />
    </div>
  ),
}

/** Enquanto a página é lida, e quando a leitura falha. */
export const CarregandoEFalha: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <IntegrationsSkeleton />
      <IntegrationsFailed onRetry={noop} />
    </div>
  ),
}

/** A lista das integrações da loja: cada uma leva à sua própria página. */
export const Lista: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <IntegrationList rows={[melhorEnvioRow, asaasRow]} newHref="#nova" />
      <IntegrationList rows={[{ ...melhorEnvioRow, status: "NEEDS_RECONNECT", sandbox: false }, { ...asaasRow, status: "NEEDS_RECONNECT", sandbox: false }]} newHref="#nova" />
    </div>
  ),
}

/** Uma das conexões não pôde ser lida: a que foi lida aparece, e a falha é dita ao lado dela. */
export const ListaComFalha: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <IntegrationList rows={[melhorEnvioRow]} newHref="#nova" />
      <IntegrationsFailed onRetry={noop} message="Não foi possível carregar todas as integrações." />
    </div>
  ),
}

/** A loja ainda sem nenhuma integração: a lista leva à página de conectar uma. */
export const ListaVazia: Story = {
  render: () => (
    <div className="max-w-3xl">
      <IntegrationList rows={[]} newHref="#nova" />
    </div>
  ),
}

/** Nova integração: o que há para conectar; um serviço já conectado leva à página dele. */
export const NovaIntegracao: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <IntegrationCatalog options={[melhorEnvioOption, asaasOption]} />
      <IntegrationCatalog options={[{ ...melhorEnvioOption, state: "connected" }, { ...asaasOption, state: "connected" }]} />
      <IntegrationCatalog options={[{ ...melhorEnvioOption, state: "unavailable" }, { ...asaasOption, state: "unavailable" }]} />
    </div>
  ),
}
