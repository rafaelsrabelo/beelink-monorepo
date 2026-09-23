// Types
import type { PageTemplateId } from '@harness-monorepo/contracts';
import type { SeededBand } from './page-seed.js';

/** Every arrangement a site may open with. The form offers exactly these, by this list. */
export const PAGE_TEMPLATE_IDS = ['servicos-b2b'] as const satisfies readonly PageTemplateId[];

/**
 * The arrangements a site opens with.
 *
 * A template is data — bands, components, sample words in pt-BR — applied once, at creation, and
 * then the owner's to change like any page. It lives here and not in the web because the API is
 * what seeds it, the way `defaultPage` seeds a shop.
 *
 * This first one is the structure the briefing of a transport company's landing page was planned
 * from: a cover, the services, how it works, and a form to get in touch — drawn with the kinds the
 * page has today. The richer pieces (numbers, steps, testimonials) replace these bands as they
 * arrive, one delivery at a time, and the template grows with them.
 */
const TEMPLATES: Record<PageTemplateId, SeededBand[]> = {
  'servicos-b2b': [
    {
      section: { name: 'Início', width: 'CONTAINED', position: 0, isActive: true },
      components: [
        {
          kind: 'HEADING',
          title: 'Sua empresa, apresentada como ela é',
          subtitle: 'Uma frase que diga o que vocês fazem e para quem. Troque este texto no modo design.',
          items: [],
          position: 0,
          isActive: true,
        },
      ],
    },
    {
      section: { name: 'Serviços', width: 'FULL', position: 1, isActive: true },
      components: [
        {
          kind: 'BENEFITS',
          items: [
            { id: 'servico-1', icon: 'truck', title: 'Serviço principal', detail: 'O que traz mais clientes' },
            { id: 'servico-2', icon: 'shield-check', title: 'Segurança', detail: 'Certificações e cuidados' },
            { id: 'servico-3', icon: 'clock', title: 'Prazo', detail: 'Tempo médio de atendimento' },
            { id: 'servico-4', icon: 'map-pin', title: 'Área de atuação', detail: 'Regiões e estados atendidos' },
          ],
          position: 0,
          isActive: true,
        },
      ],
    },
    {
      section: { name: 'Sobre', width: 'CONTAINED', position: 2, isActive: true },
      components: [
        { kind: 'HEADING', title: 'Sobre a empresa', items: [], position: 0, isActive: true },
        {
          kind: 'TEXT',
          body: 'Conte a história em poucas linhas: quando começou, o que faz melhor e por que um cliente escolhe vocês.',
          align: 'CENTER',
          items: [],
          position: 1,
          isActive: true,
        },
      ],
    },
    {
      section: { name: 'Como funciona', width: 'CONTAINED', position: 3, isActive: true },
      components: [
        { kind: 'HEADING', title: 'Como funciona', subtitle: 'Do pedido à entrega', items: [], position: 0, isActive: true },
        {
          kind: 'TEXT',
          body: '1. Você entra em contato.\n2. Recebe a proposta.\n3. Acompanha a entrega.',
          align: 'CENTER',
          items: [],
          position: 1,
          isActive: true,
        },
      ],
    },
    {
      section: { name: 'Contato', width: 'CONTAINED', position: 4, isActive: true },
      components: [
        {
          kind: 'CONTACT',
          title: 'Fale com a gente',
          subtitle: 'Conte o que precisa e respondemos em até um dia útil.',
          items: [
            { id: 'email', label: 'E-mail', type: 'EMAIL', required: true },
            { id: 'telefone', label: 'Telefone', type: 'PHONE', required: true },
            { id: 'empresa', label: 'Empresa', type: 'TEXT', required: false },
            { id: 'mensagem', label: 'O que você precisa?', type: 'TEXTAREA', required: true },
          ],
          position: 0,
          isActive: true,
        },
      ],
    },
  ],
};

export function templatePage(id: PageTemplateId): SeededBand[] {
  return TEMPLATES[id];
}
