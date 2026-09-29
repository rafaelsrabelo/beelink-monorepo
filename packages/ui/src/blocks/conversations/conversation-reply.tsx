"use client"

// React
import { useId, useRef, type FormEvent, type KeyboardEvent } from "react"

// Libs
import { SendHorizontalIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ConversationReplyProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  pending?: boolean
  /** Why the last answer failed, in the shopkeeper's words; the text stays in the field. */
  error?: string | null
  /** False while there is nothing to send, or too much. */
  canSend?: boolean
  messages?: UiMessages
}

/**
 * The shop's answer. Enter sends and Shift+Enter breaks the line; on a touch keyboard Enter breaks
 * the line and the button sends. Not disabled while sending, so the focus stays where it was.
 */
export function ConversationReply({ value, onChange, onSubmit, pending = false, error, canSend = true, messages = defaultMessages }: ConversationReplyProps) {
  const text = messages.conversations
  const id = useId()
  const errorId = `${id}-error`
  const field = useRef<HTMLTextAreaElement>(null)
  const ready = canSend && !pending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (ready) onSubmit()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // 229 is Safari's Enter that ends a composition.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (window.matchMedia?.("(pointer: coarse)").matches) return
    event.preventDefault()
    if (ready) onSubmit()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="border-input focus-within:border-ring flex items-end gap-2 rounded-lg border p-2">
        <label htmlFor={id} className="sr-only">
          {text.replyLabel}
        </label>
        <textarea
          ref={field}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={text.replyPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="placeholder:text-muted-foreground max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-disabled={pending || undefined}
          onClick={() => field.current?.focus()}
          className="bg-primary text-primary-foreground flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-50"
        >
          <SendHorizontalIcon aria-hidden="true" className="size-4" />
          {pending ? text.sending : text.send}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </form>
  )
}
