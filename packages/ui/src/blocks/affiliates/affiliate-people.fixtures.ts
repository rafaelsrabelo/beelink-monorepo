// Block
import type { AffiliateListItemView, AffiliateCommissionView, AffiliateRecordView, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"

export const tableOptions: AffiliateTableOption[] = [
  { id: "t-padrao", name: "Padrão", rate: "10%" },
  { id: "t-influ", name: "Influencers", rate: "15%" },
]

export const people: AffiliateListItemView[] = [
  { id: "a-joao", name: "João Silva", email: "joao@exemplo.com", status: "ACTIVE", tableName: "Influencers", since: "Desde 12 de nov." },
  { id: "a-maria", name: "Maria Souza", email: "maria@exemplo.com", status: "INVITED", tableName: "Padrão", since: "Convidado em 11 de nov." },
  { id: "a-ana", name: "Ana Lima", email: "ana@exemplo.com", status: "PAUSED", tableName: "Padrão", since: "Desde 2 de out." },
]


export const record: AffiliateRecordView = {
  name: "João Silva",
  email: "joao@exemplo.com",
  phone: "(85) 99999-4321",
  cpf: "529.982.247-25",
  status: "ACTIVE",
  link: "https://beelink.com.br/lessari/joao",
  pixKey: "joao@exemplo.com",
  terms: "Versão 2, aceita em 12 de nov.",
  history: ["Convidado em 11 de nov.", "Aceitou em 12 de nov."],
  invite: null,
  photoUrl: "https://picsum.photos/seed/joao/96",
  tagline: "Separei meus favoritos aqui",
  note: "Indicou 3 amigas no lançamento.",
}

export const invitedRecord: AffiliateRecordView = {
  name: "Maria Souza",
  email: "maria@exemplo.com",
  phone: null,
  cpf: null,
  status: "INVITED",
  link: null,
  pixKey: null,
  terms: null,
  history: ["Convidado em 11 de nov."],
  invite: "Convite enviado em 11 de nov. O link vale até 18 de nov.",
  photoUrl: null,
  tagline: null,
  note: null,
}

/** What the Influencers table pays, as the record's commission tab reads it. */
export const commission: AffiliateCommissionView = {
  general: "15%",
  categories: [
    { name: "Bolsas", rate: "20%" },
    { name: "Acessórios", rate: "5%" },
  ],
  productsOwn: 2,
}
