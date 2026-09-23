// Nest
import { BadRequestException } from '@nestjs/common';

// Libs
import { z } from 'zod';

// Types
import type { ContactField, ContactFieldType, LeadAnswer, LeadErrorCode } from '@harness-monorepo/contracts';

// App
import { CONTACT_FIELD_TYPES } from '../page/page.constants.js';
import {
  LEAD_EMAIL_MAX_LENGTH,
  LEAD_LONG_ANSWER_MAX_LENGTH,
  LEAD_PHONE_DIGITS_MAX,
  LEAD_PHONE_DIGITS_MIN,
  LEAD_SHORT_ANSWER_MAX_LENGTH,
} from './leads.constants.js';

/** Keeps every code this module answers inside the contract's union. */
export function leadError(errorCode: LeadErrorCode, message: string): { errorCode: LeadErrorCode; message: string } {
  return { errorCode, message };
}

/**
 * An answer as the JSON column takes it.
 *
 * A type literal restating `LeadAnswer`, not the interface: Prisma's `InputJsonValue` wants an
 * index signature, which an interface never has. The `satisfies` where rows are built keeps the
 * two from drifting.
 */
export type AnswerRow = { fieldId: string; label: string; type: ContactFieldType; value: string };

export interface CheckedAnswers {
  /** The first e-mail the form asked for, or null. Lifted out because it is how the owner replies. */
  email: string | null;
  /** The first phone, as digits, or null. */
  phone: string | null;
  /** Every answered field, in the form's order, each with the label it was asked under. */
  answers: AnswerRow[];
}

/** Something at both sides of an `@` and a dot after it. The mail server is the real check. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Refused with the field named: "Telefone: telefone inválido" is what the form can show. */
function refuse(label: string, why: string): never {
  throw new BadRequestException(leadError('LEAD_ANSWER_INVALID', `${label}: ${why}`));
}

/**
 * One value, checked and normalised by its field's type. Null is "left blank", which only an
 * optional field may be.
 */
function checkedValue(field: ContactField, raw: unknown): string | null {
  if (raw !== undefined && typeof raw !== 'string') refuse(field.label, 'resposta inválida');

  const value = ((raw as string | undefined) ?? '').trim();
  if (!value) return field.required ? refuse(field.label, 'campo obrigatório') : null;

  switch (field.type) {
    case 'EMAIL': {
      const email = value.toLowerCase();
      if (email.length > LEAD_EMAIL_MAX_LENGTH || !EMAIL.test(email)) refuse(field.label, 'e-mail inválido');
      return email;
    }
    case 'PHONE': {
      // Digits only, the way the shop's own WhatsApp is stored, so a `wa.me` link can be built.
      const digits = value.replace(/\D/g, '');
      if (digits.length < LEAD_PHONE_DIGITS_MIN || digits.length > LEAD_PHONE_DIGITS_MAX) {
        refuse(field.label, 'telefone inválido');
      }
      return digits;
    }
    case 'DATE': {
      if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) refuse(field.label, 'data inválida');
      return value;
    }
    case 'SELECT': {
      if (!field.options?.includes(value)) refuse(field.label, 'opção desconhecida');
      return value;
    }
    case 'TEXTAREA': {
      if (value.length > LEAD_LONG_ANSWER_MAX_LENGTH) refuse(field.label, 'texto longo demais');
      return value;
    }
    case 'TEXT': {
      if (value.length > LEAD_SHORT_ANSWER_MAX_LENGTH) refuse(field.label, 'texto longo demais');
      return value;
    }
  }
}

/**
 * A visitor's answers, checked against the fields the form declares.
 *
 * Strict about keys in both directions: a required field with no answer is refused, and so is an
 * answer to a field the form does not have — a body naming fields nobody asked is not a person
 * filling in a form. The form is the contract; the body has to fit it.
 */
export function checkAnswers(fields: readonly ContactField[], raw: Record<string, unknown>): CheckedAnswers {
  const known = new Set(fields.map((field) => field.id));
  const stray = Object.keys(raw).find((key) => !known.has(key));

  if (stray !== undefined) {
    throw new BadRequestException(leadError('LEAD_ANSWER_INVALID', `Campo desconhecido: ${stray}`));
  }

  const answers: AnswerRow[] = [];
  let email: string | null = null;
  let phone: string | null = null;

  for (const field of fields) {
    const value = checkedValue(field, raw[field.id]);
    if (value === null) continue;

    answers.push({ fieldId: field.id, label: field.label, type: field.type, value } satisfies LeadAnswer);
    if (field.type === 'EMAIL' && email === null) email = value;
    if (field.type === 'PHONE' && phone === null) phone = value;
  }

  return { email, phone, answers };
}

/** The read path of the column, forgiving like every other one here: a row that no longer parses reads as no answers. */
const answerRows = z.array(
  z.object({ fieldId: z.string(), label: z.string(), type: z.enum(CONTACT_FIELD_TYPES), value: z.string() }),
);

export function parseAnswers(raw: unknown): LeadAnswer[] {
  const parsed = answerRows.safeParse(raw);

  return parsed.success ? parsed.data : [];
}
