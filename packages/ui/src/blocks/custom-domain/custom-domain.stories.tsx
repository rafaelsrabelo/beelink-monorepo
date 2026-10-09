// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { CustomDomainCard } from "./custom-domain-card"
import { CustomDomainRecords } from "./custom-domain-records"
import { CustomDomainSkeleton } from "./custom-domain-skeleton"
import {
  ADDRESS,
  TARGET_IP,
  active,
  activeWithProblem,
  activeWithoutWww,
  pendingCertificate,
  pendingElsewhere,
  pendingElsewhereRead,
  pendingLookupFailed,
  pendingNotFound,
  pendingUnreachable,
} from "./custom-domain.fixtures"

const noop = () => {}
const errors = ptBR.customDomain.errors

const meta = {
  title: "Blocos/Painel/Domínio próprio",
  component: CustomDomainCard,
  decorators: [(Story) => <div className="max-w-4xl">{Story()}</div>],
  args: { targetIps: [TARGET_IP], domain: null, address: ADDRESS, headingAs: "h1", onSave: noop, onCheck: noop, onRemove: noop },
} satisfies Meta<typeof CustomDomainCard>

export default meta
type Story = StoryObj<typeof meta>

/** A página que ainda não tem domínio: para que serve e o campo. */
export const SemDominio: Story = {}

/** O domínio está sendo salvo e conferido: o campo travado e o botão ocupado. Pode levar alguns segundos. */
export const Salvando: Story = { args: { saving: true } }

/** A recusa da API em palavras, sob o campo: aqui, um domínio que já é de outra página. */
export const DominioRecusado: Story = { args: { saveError: errors.CUSTOM_DOMAIN_TAKEN } }

/** Pendente: o nome ainda não tem registro nenhum. É como todo domínio começa. */
export const PendenteNaoEncontrado: Story = { args: { domain: pendingNotFound } }

/** Pendente: aponta para outro lugar, e a conferência que acabou de rodar disse para onde. */
export const PendenteApontaParaOutroLugar: Story = { args: { domain: pendingElsewhere } }

/** O mesmo problema numa leitura simples, que não traz os endereços achados. */
export const PendenteApontaParaOutroLugarSemEnderecos: Story = { args: { domain: pendingElsewhereRead } }

/** Pendente: o DNS não respondeu. Nada a mudar, só tentar de novo. */
export const PendenteDnsNaoRespondeu: Story = { args: { domain: pendingLookupFailed } }

/** Pendente: o DNS já está certo e falta o certificado, que é ativado pela equipe. */
export const PendenteSemCertificado: Story = { args: { domain: pendingCertificate } }

/** Pendente: o DNS já está certo e o https não respondeu. A mesma frase do certificado. */
export const PendenteHttpsNaoRespondeu: Story = { args: { domain: pendingUnreachable } }

/** A conferência pedida agora voltou igual: o que ela achou é lido em voz alta. */
export const VerificadoAindaPendente: Story = { args: { domain: pendingNotFound, checked: true } }

/** Conferindo: os dois botões travados. */
export const Verificando: Story = { args: { domain: pendingNotFound, checking: true } }

/** A conferência que não passou: o limite de tentativas. */
export const VerificacaoRecusada: Story = { args: { domain: pendingNotFound, checkError: errors.RATE_LIMITED } }

/** Ativo: o selo verde, onde a página abre, para onde o endereço antigo leva e o minuto que a mudança leva. */
export const Ativo: Story = { args: { domain: active } }

/** Ativo, e a última conferência achou um problema: continua ativo, com o aviso. */
export const AtivoComProblema: Story = { args: { domain: activeWithProblem } }

/** Ativo sem o www: um aviso discreto, porque o domínio funciona sem ele. */
export const AtivoSemWww: Story = { args: { domain: activeWithoutWww, checked: true } }

/** O remover que não passou. */
export const RemoverFalhou: Story = { args: { domain: active, removeError: ptBR.customDomain.removeFailed } }

/** A instalação sem endereço para apontar: o aviso, sem campo. */
export const Indisponivel: Story = { args: { targetIps: null } }

/** A instalação que perdeu a configuração com um domínio já salvo: ele aparece e pode ser removido, sem conferir. */
export const IndisponivelComDominio: Story = { args: { targetIps: null, domain: pendingNotFound } }

/** Carregando: o cartão e a tabela nos seus lugares. */
export const Carregando: Story = { render: () => <CustomDomainSkeleton /> }

/** O que configurar no provedor: os registros, com o botão de copiar em cada valor, e o que é bom saber. */
export const Registros: Story = { render: () => <CustomDomainRecords targetIps={[TARGET_IP]} /> }

/** Um servidor com dois endereços: um registro A para cada. */
export const RegistrosComDoisEnderecos: Story = { render: () => <CustomDomainRecords targetIps={[TARGET_IP, "203.0.113.11"]} /> }

/** A tela como o app a monta: o cartão e, embaixo, os registros. */
export const TelaInteira: Story = {
  args: { domain: pendingElsewhere },
  render: (args) => (
    <div className="flex flex-col gap-6">
      <CustomDomainCard {...args} />
      <CustomDomainRecords targetIps={[TARGET_IP]} />
    </div>
  ),
}
