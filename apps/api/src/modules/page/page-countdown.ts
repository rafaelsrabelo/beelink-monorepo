// Types
import type { CountdownEnd } from '@harness-monorepo/contracts';
import type { ComponentShape } from './page-document.js';

// App
import { itemsOf } from './page.mapper.js';

/** When a countdown ends, or null when it has no end set. */
export function endOf(component: Pick<ComponentShape, 'kind' | 'items'>): number | null {
  if (component.kind !== 'COUNTDOWN') return null;
  const [end] = itemsOf(component.kind, component.items) as CountdownEnd[];
  const at = end ? Date.parse(end.endsAt) : Number.NaN;
  return Number.isNaN(at) ? null : at;
}

/**
 * Whether a countdown has nothing left to count: its end has come, or it never had one. The shop
 * leaves it out; the editor draws it, as ended, so the owner can find it.
 */
export function hasEnded(component: Pick<ComponentShape, 'kind' | 'items'>, now: number): boolean {
  const end = endOf(component);
  return component.kind === 'COUNTDOWN' && (end === null || end <= now);
}

/**
 * When a flash sale a template opens with ends: three days from now, on the hour — a time the owner
 * reads at a glance and changes if the sale is not theirs.
 */
export function saleEndOf(now: Date): string {
  const end = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  if (end.getUTCMinutes() || end.getUTCSeconds() || end.getUTCMilliseconds()) end.setUTCHours(end.getUTCHours() + 1, 0, 0, 0);
  return end.toISOString();
}
