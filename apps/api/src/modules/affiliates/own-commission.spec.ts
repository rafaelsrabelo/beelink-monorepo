// App
import { ownTableNameOf } from './own-commission.js';

describe("an affiliate's own table's name", () => {
  it('says whose it is', () => {
    expect(ownTableNameOf('  João Silva ', new Set())).toBe('Comissão de João Silva');
  });

  it('counts past a name the shop already has', () => {
    expect(ownTableNameOf('João', new Set(['Comissão de João']))).toBe('Comissão de João (2)');
    expect(ownTableNameOf('João', new Set(['Comissão de João', 'Comissão de João (2)']))).toBe('Comissão de João (3)');
  });

  it('fits the column, suffix and all', () => {
    const long = 'Maria '.repeat(20);
    const first = ownTableNameOf(long, new Set());
    const second = ownTableNameOf(long, new Set([first]));

    expect([...first].length).toBeLessThanOrEqual(60);
    expect([...second].length).toBeLessThanOrEqual(60);
    expect(second.endsWith(' (2)')).toBe(true);
  });
});
