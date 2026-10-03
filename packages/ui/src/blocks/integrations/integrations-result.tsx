// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface IntegrationsResultProps {
  /** A connection that went through, or what stopped it. */
  tone: "done" | "failed"
  /** Already in words. */
  message: string
}

/**
 * Over the Integrations page on the way back from a third party (BEELINK-183): what came of the
 * connection. The page was left for another site, so nothing else on it would say.
 */
export function IntegrationsResult({ tone, message }: IntegrationsResultProps) {
  return (
    <p
      role={tone === "failed" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tone === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10")}
    >
      {message}
    </p>
  )
}
