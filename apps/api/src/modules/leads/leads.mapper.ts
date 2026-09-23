// Types
import type { Lead } from '@harness-monorepo/contracts';
import type { LeadModel } from '../../generated/prisma/models.js';

// App
import { parseAnswers } from './lead-answers.js';

export function toLead(row: LeadModel): Lead {
  return {
    id: row.id,
    componentId: row.componentId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    answers: parseAnswers(row.answers),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies Lead;
}
