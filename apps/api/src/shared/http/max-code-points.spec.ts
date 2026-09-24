// Libs
import { validateSync } from 'class-validator';

// App
import { MaxCodePoints } from './max-code-points.js';

class Titled {
  @MaxCodePoints(120)
  title!: string;
}

function errorsFor(title: string) {
  return validateSync(Object.assign(new Titled(), { title }));
}

describe('MaxCodePoints', () => {
  /**
   * The case that answered a 500: validator.js counts a heart and its variation selector as one, and
   * a VARCHAR(120) counts two. Sixty-one hearts are 122 code points.
   */
  it('counts what Postgres counts, variation selectors included', () => {
    expect(errorsFor('❤️'.repeat(61))).toHaveLength(1);
    expect(errorsFor('❤️'.repeat(60))).toHaveLength(0);
  });

  it('counts a character outside the basic plane once, as Postgres does', () => {
    expect(errorsFor('😀'.repeat(120))).toHaveLength(0);
    expect(errorsFor('😀'.repeat(121))).toHaveLength(1);
  });

  it('refuses what is not text', () => {
    expect(validateSync(Object.assign(new Titled(), { title: 7 }))).toHaveLength(1);
  });
});
