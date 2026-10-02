// Types
import type { DeliveryBand } from '@harness-monorepo/contracts';

/**
 * Why a list of bands cannot be saved, or null when it can. Each band reaches further than the one
 * before — the order the shopkeeper reads them in is the order they are matched in — and arrives
 * no earlier than it starts. The bounds of each value are the DTO's; this is what no single field
 * can say on its own.
 */
export function bandsRefusal(bands: readonly DeliveryBand[]): string | null {
  for (const [index, band] of bands.entries()) {
    if (band.windowFromMinutes > band.windowToMinutes) return `Band ${index + 1} arrives before it starts`;
    const previous = bands[index - 1];
    if (previous && band.upToMeters <= previous.upToMeters) return `Band ${index + 1} does not reach further than band ${index}`;
  }
  return null;
}

/** How far the shop delivers: the last band's reach. Null with no bands. */
export function radiusOf(bands: readonly DeliveryBand[]): number | null {
  return bands.at(-1)?.upToMeters ?? null;
}
