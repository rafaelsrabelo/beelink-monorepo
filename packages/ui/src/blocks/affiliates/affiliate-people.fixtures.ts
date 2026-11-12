// Block
import type { AffiliateInviteFormValues, AffiliateListItemView, AffiliateRecordFormValues, AffiliateRecordView, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"

export const tableOptions: AffiliateTableOption[] = [
  { id: "t-padrao", name: "Padrão", rate: "10%" },
  { id: "t-influ", name: "Influencers", rate: "15%" },
]

export const people: AffiliateListItemView[] = [
  { id: "a-joao", name: "João Silva", email: "joao@exemplo.com", status: "ACTIVE", tableName: "Influencers", since: "Desde 12 de nov." },
  { id: "a-maria", name: "Maria Souza", email: "maria@exemplo.com", status: "INVITED", tableName: "Padrão", since: "Convidado em 11 de nov." },
  { id: "a-ana", name: "Ana Lima", email: "ana@exemplo.com", status: "PAUSED", tableName: "Padrão", since: "Desde 2 de out." },
]

export const inviteValue: AffiliateInviteFormValues = { name: "Maria Souza", email: "maria@exemplo.com", tableId: "t-padrao", phone: "", note: "" }

export const record: AffiliateRecordView = {
  name: "João Silva",
  email: "joao@exemplo.com",
  phone: "(85) 99999-4321",
  status: "ACTIVE",
  link: "https://beelink.com.br/lessari/joao",
  pixKey: "joao@exemplo.com",
  terms: "Versão 2, aceita em 12 de nov.",
  history: ["Convidado em 11 de nov.", "Aceitou em 12 de nov."],
  invite: null,
}

export const invitedRecord: AffiliateRecordView = {
  name: "Maria Souza",
  email: "maria@exemplo.com",
  phone: null,
  status: "INVITED",
  link: null,
  pixKey: null,
  terms: null,
  history: ["Convidado em 11 de nov."],
  invite: "Convite enviado em 11 de nov. O link vale até 18 de nov.",
}

export const recordValue: AffiliateRecordFormValues = { tableId: "t-influ", note: "Indicou 3 amigas no lançamento." }
