// Block
import type { LeadDetailItem } from "./lead-detail"

/** Two people who wrote in. Shared by the leads blocks' stories and tests. */
export const sampleLeads: LeadDetailItem[] = [
  {
    id: "1",
    name: "Carlos Lima",
    email: "carlos@obrassa.test",
    phone: "91988887777",
    status: "NEW",
    createdAt: "2026-09-23T14:05:00.000Z",
    answers: [
      { fieldId: "empresa", label: "Empresa", value: "Obras SA" },
      { fieldId: "mensagem", label: "O que você precisa?", value: "30 toneladas por semana\nde outubro a dezembro." },
    ],
  },
  {
    id: "2",
    name: "Marina Souza",
    email: null,
    phone: "91977776666",
    status: "CONTACTED",
    createdAt: "2026-09-22T09:40:00.000Z",
    answers: [],
  },
]
