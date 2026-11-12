// Block
import type { AffiliateDocumentFileView, AffiliateDocumentTypeOption, AffiliatePersonValues, AffiliateReviewView, AffiliateStartOption, AffiliateWizardStepView, CommissionTreeCategory } from "../../lib/affiliate-wizard"

/** The invite as the user drew it (12/11/2026), on its second step. */
export const wizardSteps: AffiliateWizardStepView[] = [
  { label: "Dados do afiliado", hint: "Nome, e-mail, telefone e CPF", state: "done" },
  { label: "Tabela de comissão", hint: "Por categoria ou produto", state: "current" },
  { label: "Documento", hint: "Foto da frente e do verso", state: "pending" },
  { label: "Revisão", hint: "Conferir e enviar", state: "pending" },
]

export const person: AffiliatePersonValues = { name: "João Silva", email: "joao@exemplo.com", phone: "(11) 99999-8888", cpf: "529.982.247-25" }

export const starts: AffiliateStartOption[] = [
  { id: "t-padrao", label: "Padrão · 10%" },
  { id: "t-influ", label: "Influenciadores · 15%" },
]

export const tree: CommissionTreeCategory[] = [
  {
    id: "c-whey",
    name: "Whey Protein",
    countLabel: "2 produtos · 1 personalizado",
    own: true,
    percent: 15,
    inheritLabel: "Segue o padrão · 10%",
    open: true,
    products: [
      { id: "p-iso", name: "Whey Isolado 900 g", price: "R$ 189,90", earn: "R$ 37,98", own: true, percent: 20, inheritLabel: "Segue a categoria · 15%" },
      { id: "p-conc", name: "Whey Concentrado 900 g", price: "R$ 139,90", earn: "R$ 20,98", own: false, percent: 15, inheritLabel: "Segue a categoria · 15%" },
    ],
  },
  { id: "c-crea", name: "Creatina", countLabel: "1 produto", own: false, percent: 10, inheritLabel: "Segue o padrão · 10%", open: false, products: [] },
]

export const documentTypes: AffiliateDocumentTypeOption[] = [
  { value: "RG", label: "RG" },
  { value: "CNH", label: "CNH" },
  { value: "CIN", label: "CIN" },
  { value: "RNE_CRNM", label: "RNE/CRNM" },
  { value: "PASSPORT", label: "Passaporte" },
]

export const emptyFiles: AffiliateDocumentFileView[] = [
  { side: "front", label: "Frente", fileName: null, size: null, previewUrl: null, status: "empty" },
  { side: "back", label: "Verso", fileName: null, size: null, previewUrl: null, status: "empty" },
]

export const chosenFiles: AffiliateDocumentFileView[] = [
  { side: "front", label: "Frente", fileName: "rg-frente.jpg", size: "1,2 MB", previewUrl: null, status: "ready" },
  { side: "back", label: "Verso", fileName: "rg-verso.pdf", size: "320 KB", previewUrl: null, status: "uploading" },
]

export const review: AffiliateReviewView = {
  name: "João Silva",
  email: "joao@exemplo.com",
  contact: "(11) 99999-8888 · CPF 529.982.247-25",
  commissionBase: "12%",
  commissionHint: "da venda, valor base",
  rules: [
    { kindLabel: "Categoria", name: "Whey Protein", value: "15%" },
    { kindLabel: "Produto", name: "Whey Isolado 900 g", value: "20%" },
  ],
  documentTitle: "Documento (RG)",
  documentLines: [
    { label: "Frente", status: "rg-frente.jpg" },
    { label: "Verso", status: "não anexado" },
  ],
}
