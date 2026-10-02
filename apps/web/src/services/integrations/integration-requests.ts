// Types
import type { MelhorEnvioAccountOverview, MelhorEnvioConnection, MelhorEnvioSettings, MelhorEnvioSettingsPayload } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class IntegrationError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "IntegrationError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "PUT" | "DELETE" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new IntegrationError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const melhorEnvio = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/integrations/melhor-envio`

/** Where "Conectar" sends the browser: a navigation, never a fetch — it leaves for Melhor Envio. */
export const melhorEnvioConnectHref = (slug: string): string => `${melhorEnvio(slug)}/connect`

export function fetchMelhorEnvioConnection(slug: string): Promise<MelhorEnvioConnection> {
  return ask(melhorEnvio(slug))
}

export function fetchMelhorEnvioAccount(slug: string): Promise<MelhorEnvioAccountOverview> {
  return ask(`${melhorEnvio(slug)}/account`)
}

export function fetchMelhorEnvioSettings(slug: string): Promise<MelhorEnvioSettings> {
  return ask(`${melhorEnvio(slug)}/settings`)
}

export function saveMelhorEnvioSettings(slug: string, payload: MelhorEnvioSettingsPayload): Promise<MelhorEnvioSettings> {
  return ask(`${melhorEnvio(slug)}/settings`, "PUT", payload)
}

export function disconnectMelhorEnvio(slug: string): Promise<object> {
  return ask(melhorEnvio(slug), "DELETE")
}
