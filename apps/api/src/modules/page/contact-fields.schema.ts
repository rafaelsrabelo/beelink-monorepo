// Libs
import { z } from 'zod';

// Types
import type { ContactField } from '@harness-monorepo/contracts';

// App
import {
  CONTACT_FIELDS_MAX,
  CONTACT_FIELD_LABEL_MAX_LENGTH,
  CONTACT_FIELD_TYPES,
  CONTACT_OPTIONS_MAX,
  CONTACT_OPTION_MAX_LENGTH,
} from './page.constants.js';

/** One field of a contact form. A select carries its choices; nothing else may. */
const contactField = z
  .strictObject({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(CONTACT_FIELD_LABEL_MAX_LENGTH),
    type: z.enum(CONTACT_FIELD_TYPES),
    required: z.boolean(),
    options: z.array(z.string().min(1).max(CONTACT_OPTION_MAX_LENGTH)).min(1).max(CONTACT_OPTIONS_MAX).nullish(),
  })
  .refine((row) => (row.type === 'SELECT') === !!row.options?.length, {
    message: 'Uma lista de opções precisa das opções; os outros tipos não as têm',
  }) satisfies z.ZodType<ContactField>;

/** A field a visitor can be answered through: an e-mail or a phone they had to give. */
export function reachesBack(field: Pick<ContactField, 'type' | 'required'>): boolean {
  return field.required && (field.type === 'EMAIL' || field.type === 'PHONE');
}

/**
 * The whole form. Two rules the fields cannot state one at a time: ids are unique, because an
 * answer is keyed by them; and at least one field reaches back, because a lead nobody can answer
 * is not a lead. Stated here and not in the panel — the panel mirrors it, this is the lock.
 */
export const contactForm = z
  .array(contactField)
  .max(CONTACT_FIELDS_MAX)
  .refine((fields) => new Set(fields.map((field) => field.id)).size === fields.length, {
    message: 'Dois campos com o mesmo id',
  })
  .refine((fields) => fields.some(reachesBack), {
    message: 'O formulário precisa de um campo obrigatório de e-mail ou telefone',
  });
