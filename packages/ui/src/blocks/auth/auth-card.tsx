// React
import type { ReactNode } from "react"

// UI
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@harness-monorepo/ui/components/card"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface AuthCardProps {
  title: string
  description: string
  /** A sentence the reader can act on. The screen turns an API errorCode into it. */
  error?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/** The frame every auth screen shares: one card, one title, one place for the server's answer. */
export function AuthCard({ title, description, error, children, footer, className }: AuthCardProps) {
  return (
    <div className={cn("flex w-full max-w-sm flex-col gap-6", className)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {children}
        </CardContent>
      </Card>
      {footer ? (
        // Not text-muted-foreground: the footer sits outside the card, on the layout's muted
        // background, where that token measures 4.34:1 — under the 4.5:1 WCAG AA asks for.
        <div className="px-6 text-center text-sm text-foreground/80">{footer}</div>
      ) : null}
    </div>
  )
}
