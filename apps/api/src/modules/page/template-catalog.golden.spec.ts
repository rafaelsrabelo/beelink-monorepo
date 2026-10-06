// Types
import type { LandingTemplateId } from '@harness-monorepo/contracts';
import type { LandingSubject } from './landing-templates.js';

// App
import { coverImageOf, landingBands } from './landing-templates.js';
import { promisesOf } from './page-seed.js';
import { templatePage } from './page-templates.js';

const PRODUCT = { id: '0199e000-0000-7000-8000-000000000001', name: 'Whey Baunilha 900 g', description: 'Proteína isolada.', imageUrl: 'https://cdn.example/whey.png' };
const CATEGORY = { id: '0199d000-0000-7000-8000-000000000001', name: 'Proteínas', description: 'Para depois do treino', imageUrl: 'https://cdn.example/proteinas.png' };

function subject(over: Partial<LandingSubject> = {}): LandingSubject {
  return {
    title: 'Minha página',
    product: PRODUCT,
    category: CATEGORY,
    promises: promisesOf(['PIX', 'MONEY']),
    saleEndsAt: '2026-09-30T02:00:00.000Z',
    ...over,
  };
}

const SUBJECTS: [string, LandingSubject][] = [
  ['everything', subject()],
  ['no picture', subject({ product: { ...PRODUCT, imageUrl: null }, category: { ...CATEGORY, imageUrl: null } })],
  ['no category', subject({ category: null })],
  ['nothing to promise', subject({ promises: [] })],
  ['no product', subject({ product: null, category: null })],
];

const LANDINGS: LandingTemplateId[] = ['lancamento', 'promocao-relampago', 'colecao', 'em-branco'];

/**
 * The bands each of the five templates wrote before the catalogue existed, frozen from the builders
 * as they were called then. Moving a template into the catalogue changes none of them.
 */
describe('the templates that existed before the catalogue', () => {
  it('servicos-b2b arranges the bands it always did', () => {
    expect(templatePage('servicos-b2b')).toMatchSnapshot();
  });

  it.each(LANDINGS.flatMap((id) => SUBJECTS.map(([name, of]) => [id, name, of] as const)))(
    '%s with %s arranges the bands it always did',
    (id, _name, of) => {
      expect(landingBands(id, of)).toMatchSnapshot();
      expect(coverImageOf(id, of)).toMatchSnapshot();
    },
  );
});
