// Block
import type { LegalDocumentContent } from "./legal-document"

/** A short legal text in the shape the web keeps them, for the story and the test. */
export const sampleLegalDocument: LegalDocumentContent = {
  lang: "pt-BR",
  title: "Política de privacidade",
  effective: "Vigente desde 30 de setembro de 2026",
  intro: ["Esta política explica quais dados o bee-link guarda, para quê e por quanto tempo."],
  sections: [
    {
      heading: "Quem cuida dos seus dados",
      blocks: [
        { kind: "paragraph", text: "Nos dados dos clientes de uma loja, a loja é a controladora e o bee-link é o operador." },
        { kind: "list", items: ["Nome e e-mail da conta", "Telefone e endereços de entrega", "Pedidos e conversas"] },
      ],
    },
    {
      heading: "Seus direitos",
      blocks: [{ kind: "paragraph", text: "Você pode pedir acesso, correção ou exclusão dos seus dados pelo canal indicado nesta política." }],
    },
  ],
}
