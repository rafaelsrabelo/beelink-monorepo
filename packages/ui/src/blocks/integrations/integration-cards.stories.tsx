// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { IntegrationCards } from "./integration-cards"
import { asaasCard, beeflowUpcoming, melhorEnvioCard } from "./integrations.fixtures"

const noop = () => {}

const meta = {
  title: "Blocos/Painel/Integrações/Lista",
  component: IntegrationCards,
  decorators: [(Story) => <div className="max-w-6xl">{Story()}</div>],
  args: { cards: [melhorEnvioCard, asaasCard], onRetry: noop },
} satisfies Meta<typeof IntegrationCards>

export default meta
type Story = StoryObj<typeof meta>

/** A loja que ainda não conectou nada: os dois serviços, cada um com o seu "Conectar". */
export const NaoConectadas: Story = {}

/** Conectadas: o selo verde, de quem é a conta e "Configurar", que leva à página de cada uma. */
export const Conectadas: Story = {
  args: {
    cards: [
      { ...melhorEnvioCard, connection: { state: "connected", account: "Loja Lessari", sandbox: false } },
      { ...asaasCard, connection: { state: "connected", account: "Lessari Moda LTDA", sandbox: true } },
    ],
  },
}

/** Uma conectada ao lado de outra por conectar: o caso comum. */
export const UmaConectada: Story = {
  args: { cards: [{ ...melhorEnvioCard, connection: { state: "connected", account: "Loja Lessari", sandbox: true } }, asaasCard] },
}

/** O serviço parou de aceitar a conexão: o aviso e "Reconectar". O Melhor Envio também leva à sua página. */
export const PrecisaReconectar: Story = {
  args: {
    cards: [
      { ...melhorEnvioCard, connection: { state: "needsReconnect", account: "Loja Lessari", sandbox: false } },
      { ...asaasCard, connection: { state: "needsReconnect", account: "Lessari Moda LTDA", sandbox: false } },
    ],
  },
}

/** Conectada, mas a conta ainda não foi aprovada do outro lado: nunca o selo verde, e "Configurar" leva ao que fazer. */
export const ContaNaoAprovada: Story = {
  args: {
    cards: [
      { ...melhorEnvioCard, connection: { state: "connected", account: "Loja Lessari", sandbox: false } },
      { ...asaasCard, connection: { state: "unapproved", account: "Lessari Moda LTDA", sandbox: false } },
    ],
  },
}

/** Sem o serviço configurado na instalação: a frase, e nada para apertar. */
export const Indisponivel: Story = {
  args: { cards: [{ ...melhorEnvioCard, connection: { state: "unavailable", account: null, sandbox: false } }, asaasCard] },
}

/** Com o que vem por aí: o BeeFlow anunciado depois das integrações, com "Em breve" e nada para apertar. */
export const ComEmBreve: Story = {
  args: { cards: [{ ...melhorEnvioCard, connection: { state: "connected", account: "Loja Lessari", sandbox: true } }, asaasCard], upcoming: [beeflowUpcoming] },
}

/** Enquanto as conexões são lidas: o nome e a logo já estão lá, e só o estado e a ação esperam. */
export const Carregando: Story = {
  args: { cards: [{ ...melhorEnvioCard, connection: "loading" }, { ...asaasCard, connection: "loading" }] },
}

/** Uma leitura falhou: a falha fica no cartão dela, com "Tentar de novo", e o outro segue inteiro. */
export const UmaLeituraFalhou: Story = {
  args: { cards: [{ ...melhorEnvioCard, connection: { state: "connected", account: "Loja Lessari", sandbox: true } }, { ...asaasCard, connection: "failed" }] },
}
