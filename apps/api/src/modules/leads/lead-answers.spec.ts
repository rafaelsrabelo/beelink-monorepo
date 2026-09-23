// Types
import type { ContactField } from '@harness-monorepo/contracts';

// App
import { checkAnswers, parseAnswers } from './lead-answers.js';

const FIELDS: ContactField[] = [
  { id: 'email', label: 'E-mail', type: 'EMAIL', required: true },
  { id: 'telefone', label: 'Telefone', type: 'PHONE', required: false },
  { id: 'empresa', label: 'Empresa', type: 'TEXT', required: false },
  { id: 'volume', label: 'Volume', type: 'SELECT', required: false, options: ['Até 10t', 'Mais de 10t'] },
  { id: 'quando', label: 'Data desejada', type: 'DATE', required: false },
  { id: 'mensagem', label: 'Mensagem', type: 'TEXTAREA', required: false },
];

const invalid = (message: RegExp) => expect.objectContaining({ response: expect.objectContaining({ errorCode: 'LEAD_ANSWER_INVALID', message: expect.stringMatching(message) }) });

describe('checkAnswers — the body has to fit the form', () => {
  it('lifts the first e-mail and the first phone out, normalised', () => {
    const checked = checkAnswers(FIELDS, { email: '  Carlos@Exemplo.TEST ', telefone: '(11) 98888-7777' });

    expect(checked.email).toBe('carlos@exemplo.test');
    expect(checked.phone).toBe('11988887777');
  });

  /** The label travels with the value: a field renamed later must not make this lead unreadable. */
  it('keeps every answered field with the label it was asked under, in the form’s order', () => {
    const checked = checkAnswers(FIELDS, {
      mensagem: 'Preciso de 30t por semana',
      email: 'a@b.co',
      empresa: 'Asfalto Norte',
    });

    expect(checked.answers).toEqual([
      { fieldId: 'email', label: 'E-mail', type: 'EMAIL', value: 'a@b.co' },
      { fieldId: 'empresa', label: 'Empresa', type: 'TEXT', value: 'Asfalto Norte' },
      { fieldId: 'mensagem', label: 'Mensagem', type: 'TEXTAREA', value: 'Preciso de 30t por semana' },
    ]);
  });

  it('leaves an optional field blank without a row for it', () => {
    const checked = checkAnswers(FIELDS, { email: 'a@b.co', empresa: '   ' });

    expect(checked.answers).toHaveLength(1);
    expect(checked.phone).toBeNull();
  });

  it('refuses a required field left blank, naming it', () => {
    expect(() => checkAnswers(FIELDS, { empresa: 'Só o nome' })).toThrow(invalid(/E-mail: campo obrigatório/));
  });

  /** A body naming fields nobody asked is not a person filling in a form. */
  it('refuses an answer to a field the form does not have', () => {
    expect(() => checkAnswers(FIELDS, { email: 'a@b.co', cnpj: '123' })).toThrow(invalid(/Campo desconhecido: cnpj/));
  });

  it.each([
    ['an e-mail with no @', { email: 'carlos.exemplo' }, /E-mail: e-mail inválido/],
    ['a phone with too few digits', { email: 'a@b.co', telefone: '9999' }, /Telefone: telefone inválido/],
    ['a date that is not a date', { email: 'a@b.co', quando: '31/12/2026' }, /Data desejada: data inválida/],
    ['a choice the select does not offer', { email: 'a@b.co', volume: 'Muito' }, /Volume: opção desconhecida/],
    ['a line longer than a line', { email: 'a@b.co', empresa: 'x'.repeat(201) }, /Empresa: texto longo demais/],
    ['a value that is not text', { email: 'a@b.co', empresa: 42 }, /Empresa: resposta inválida/],
  ])('refuses %s', (_, body, message) => {
    expect(() => checkAnswers(FIELDS, body as Record<string, unknown>)).toThrow(invalid(message));
  });

  it('takes a choice the select offers, and a date it can parse', () => {
    const checked = checkAnswers(FIELDS, { email: 'a@b.co', volume: 'Mais de 10t', quando: '2026-10-01' });

    expect(checked.answers.map((answer) => answer.value)).toEqual(['a@b.co', 'Mais de 10t', '2026-10-01']);
  });
});

describe('parseAnswers — the read path never throws', () => {
  it('reads rows back as they were written', () => {
    const rows = [{ fieldId: 'email', label: 'E-mail', type: 'EMAIL', value: 'a@b.co' }];

    expect(parseAnswers(rows)).toEqual(rows);
  });

  it('reads a column that no longer parses as no answers, not as an error', () => {
    expect(parseAnswers({ not: 'a list' })).toEqual([]);
    expect(parseAnswers([{ fieldId: 'x', type: 'WHAT', value: 1 }])).toEqual([]);
  });
});
