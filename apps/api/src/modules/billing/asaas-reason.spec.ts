// Libs
import { describe, expect, it } from 'vitest';

// App
import { reasonWithout } from './asaas-reason.js';

/** Made up: the textbook CPF, and a CNPJ that checks out. */
const person = { name: 'Zuleica Tavares', document: '52998224725', email: 'zuleica.tavares@exemplo.test' };
const company = { name: 'Lessari Moda (Matriz) LTDA', document: '11222333000181', email: 'financeiro+asaas@lessari.test' };

describe("Asaas's words about a refusal, fit for a log", () => {
  /** As the sandbox said them on 13/10/2026: they name the kind of problem, not the value. */
  it('leaves what names nobody as it was said', () => {
    for (const reason of ['O CPF/CNPJ informado é inválido.', 'O cliente [9458155] não pode ser atualizado: Cliente excluído, não é possível fazer alterações.', 'no reason given']) {
      expect(reasonWithout(reason, person)).toBe(reason);
    }
  });

  it('takes the document out, bare or with its points, dash, slash and spaces', () => {
    expect(reasonWithout('O CPF 52998224725 é inválido.', person)).toBe('O CPF [document] é inválido.');
    expect(reasonWithout('O CPF 529.982.247-25 é inválido.', person)).toBe('O CPF [document] é inválido.');
    expect(reasonWithout('CPF 529 982 247 25 já cadastrado (529.982.247-25)', person)).toBe('CPF [document] já cadastrado ([document])');
    expect(reasonWithout('O CNPJ 11.222.333/0001-81 é inválido.', company)).toBe('O CNPJ [document] é inválido.');
    expect(reasonWithout('O CNPJ 12.abc.345/01de-35 é inválido.', { ...company, document: '12ABC34501DE35' })).toBe('O CNPJ [document] é inválido.');
  });

  it('takes the e-mail and the name out, whatever their case and whatever marks they hold', () => {
    expect(reasonWithout('O e-mail Zuleica.Tavares@Exemplo.test é inválido.', person)).toBe('O e-mail [e-mail] é inválido.');
    expect(reasonWithout('O e-mail financeiro+asaas@lessari.test é inválido.', company)).toBe('O e-mail [e-mail] é inválido.');
    expect(reasonWithout('Cliente ZULEICA TAVARES já existe.', person)).toBe('Cliente [name] já existe.');
    expect(reasonWithout('Cliente Lessari Moda (Matriz) LTDA já existe.', company)).toBe('Cliente [name] já existe.');
  });

  it('takes out all three at once, and leaves another number alone', () => {
    const said = reasonWithout('Zuleica Tavares (529.982.247-25, zuleica.tavares@exemplo.test) não pôde ser criado: limite de 25000 atingido.', person);

    expect(said).toBe('[name] ([document], [e-mail]) não pôde ser criado: limite de 25000 atingido.');
  });

  it('has nothing to take out of a customer told with empty fields', () => {
    expect(reasonWithout('O CPF/CNPJ informado é inválido.', { name: '', document: '', email: '' })).toBe('O CPF/CNPJ informado é inválido.');
  });
});
