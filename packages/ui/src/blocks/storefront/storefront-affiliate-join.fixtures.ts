// Block
import type { AffiliateJoinFormValues, AffiliateJoinFormView, AffiliateJoinPageView } from "@harness-monorepo/ui/lib/affiliate-join"

/** The product's own page at a shop called Lessari, announcing 10%: what a shop that wrote nothing shows. */
export const joinPage: AffiliateJoinPageView = {
  badge: "Programa de afiliados",
  title: "Indique a Lessari e ganhe 10% em cada venda",
  subtitle: "Você recebe um link só seu. Quem compra por ele paga o preço de sempre, e a comissão é sua.",
  ctaLabel: "Quero ser afiliado",
  highlights: ["Não custa nada para você", "Recebe por Pix", "Candidatura em 1 minuto"],
  imageUrl: null,
  stepsTitle: "Como funciona",
  steps: [
    { title: "Candidate-se", text: "Nome, e-mail e WhatsApp. Leva um minuto." },
    { title: "Receba o convite", text: "Aprovado, chega um e-mail para você criar sua conta, escolher o seu link e informar sua chave Pix." },
    { title: "Divulgue e ganhe", text: "Cada compra feita pelo seu link gera comissão quando o pedido é entregue." },
  ],
  benefits: [
    { title: "10% de comissão", text: "Sobre os produtos de cada venda. O frete não entra na conta." },
    { title: "Preço de sempre", text: "Quem compra pelo seu link paga o mesmo preço da loja." },
  ],
  questionsTitle: "Perguntas frequentes",
  questions: [{ question: "Quando a comissão é paga?", answer: "Três vezes por mês, no prazo da loja." }],
  closingTitle: "Pronto para indicar a Lessari?",
  closingText: "Envie sua candidatura agora. A resposta chega no seu e-mail.",
}

export const joinForm: AffiliateJoinFormView = {
  title: "Quero ser afiliado",
  subtitle: "A Lessari analisa e responde no seu e-mail.",
  extraQuestion: "Onde você vai divulgar?",
  note: "Seus dados ficam com a Lessari para analisar a candidatura. Não aparecem na loja.",
}

export const emptyJoinForm: AffiliateJoinFormValues = { name: "", email: "", phone: "", extraAnswer: "", accepted: false, website: "" }
