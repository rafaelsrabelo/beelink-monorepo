"use client"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DesignHeaderProps {
  /** The draft differs from the server: something to publish, and something to discard. */
  changed: boolean
  publishing: boolean
  onPublish: () => void
  onDiscard: () => void
  messages: UiMessages
}

/** Design mode's title, and the two things the arrangement's draft can do: publish, or go back. */
export function DesignHeader({ changed, publishing, onPublish, onDiscard, messages }: DesignHeaderProps) {
  const text = messages.design

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {/*
            `changed` and not `dirty`: the badge answers the diff against the server, so moving a
            band and moving it back stops claiming there is something to publish — and Publish
            stops being enabled for a write that would send nothing.
          */}
          {changed ? <Badge variant="outline">{text.unpublished}</Badge> : null}
          {changed ? (
            <Button type="button" variant="ghost" disabled={publishing} onClick={onDiscard}>
              {text.discard}
            </Button>
          ) : null}
          <Button type="button" disabled={!changed || publishing} onClick={onPublish}>
            {publishing ? text.publishing : text.publish}
          </Button>
        </div>
      </header>

      {changed ? <p className="text-muted-foreground text-sm">{text.leaveWarning}</p> : null}
    </>
  )
}
