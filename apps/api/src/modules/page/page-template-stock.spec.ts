// App
import { stockedCategories } from './page-template-stock.js';

const row = (id: string, onShelf: number, parentId: string | null = null) => ({ id, name: id, parentId, onShelf });

describe('the categories a home model may give a shelf', () => {
  it('are the top levels with something on the shelf, in the order given', () => {
    expect(stockedCategories([row('roupas', 2), row('vazia', 0), row('calcados', 1)])).toEqual([
      { id: 'roupas', name: 'roupas' },
      { id: 'calcados', name: 'calcados' },
    ]);
  });

  it('count a child’s products for its parent, and never offer the child a shelf of its own', () => {
    expect(stockedCategories([row('proteinas', 0), row('whey', 3, 'proteinas')])).toEqual([{ id: 'proteinas', name: 'proteinas' }]);
  });

  it('leave out a child whose parent is hidden: it is not among the rows', () => {
    expect(stockedCategories([row('whey', 3, 'escondida')])).toEqual([]);
  });

  it('are none in a shop with no category', () => {
    expect(stockedCategories([])).toEqual([]);
  });
});
