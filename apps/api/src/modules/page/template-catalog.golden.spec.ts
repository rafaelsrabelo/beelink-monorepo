// Types
import type { LandingTemplateId } from '@harness-monorepo/contracts';
import type { TemplateSubject } from './template-catalog.js';

// App
import { promisesOf } from './page-seed.js';
import { templateOf } from './template-catalog.js';

const PRODUCT = { id: '0199e000-0000-7000-8000-000000000001', name: 'Whey Baunilha 900 g', description: 'Proteína isolada.', imageUrl: 'https://cdn.example/whey.png' };
const CATEGORY = { id: '0199d000-0000-7000-8000-000000000001', name: 'Proteínas', description: 'Para depois do treino', imageUrl: 'https://cdn.example/proteinas.png' };

function subject(over: Partial<TemplateSubject> = {}): TemplateSubject {
  return {
    title: 'Minha página',
    product: PRODUCT,
    category: CATEGORY,
    promises: promisesOf(['PIX', 'MONEY']),
    saleEndsAt: '2026-09-30T02:00:00.000Z',
    ...over,
  };
}

const SUBJECTS: [string, TemplateSubject][] = [
  ['everything', subject()],
  ['no picture', subject({ product: { ...PRODUCT, imageUrl: null }, category: { ...CATEGORY, imageUrl: null } })],
  ['no category', subject({ category: null })],
  ['nothing to promise', subject({ promises: [] })],
  ['no product', subject({ product: null, category: null })],
];

const LANDINGS: LandingTemplateId[] = ['lancamento', 'promocao-relampago', 'colecao', 'em-branco'];

/**
 * The bands each of the five templates wrote before the catalogue existed. The snapshot was taken
 * from the builders as store creation and landing creation called them then, and is not to be
 * updated to make this pass: reached through the catalogue, each template writes the same bands.
 */
describe('the templates that existed before the catalogue', () => {
  it('servicos-b2b arranges the bands it always did', () => {
    expect(templateOf('servicos-b2b').bands(subject())).toMatchSnapshot();
  });

  it.each(LANDINGS.flatMap((id) => SUBJECTS.map(([name, of]) => [id, name, of] as const)))(
    '%s with %s arranges the bands it always did',
    (id, _name, of) => {
      expect(templateOf(id).bands(of)).toMatchSnapshot();
      expect(templateOf(id).coverImage(of)).toMatchSnapshot();
    },
  );
});
