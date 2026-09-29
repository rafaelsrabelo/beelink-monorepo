"use client"

// React
import { useId, type FormEvent, type KeyboardEvent } from "react"

// Libs
import { SendHorizontalIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontConversationComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** Sending: the button says so, and nothing is sent twice. */
  pending?: boolean
  /** Why the last send failed, in the shopper's words; the text stays in the field. */
  error?: string | null
  /** False while there is nothing to send, or too much. */
  canSend?: boolean
  messages?: UiMessages
}

/**
 * Where the shopper writes to the shop. Enter sends and Shift+Enter breaks the line, as in any chat;
 * the field and its text stay put until the shop's answer says the message is in.
 */
export function StorefrontConversationComposer({ value, onChange, onSubmit, pending = false, error, canSend = true, messages = defaultMessages }: StorefrontConversationComposerProps) {
  const text = messages.storefront
  const id = useId()
  const errorId = `${id}-error`
  const ready = canSend && !pending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (ready) onSubmit()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (ready) onSubmit()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2 rounded-xl border border-shop-line-strong bg-shop-background p-2 focus-within:border-shop-primary">
        <label htmlFor={id} className="sr-only">
          {text.conversationLabel}
        </label>
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={text.conversationPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm text-shop-on-background outline-none placeholder:text-shop-placeholder"
        />
        <button
          type="submit"
          disabled={!ready}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-shop-primary px-4 text-sm font-bold text-shop-on-primary disabled:opacity-50"
        >
          <SendHorizontalIcon aria-hidden="true" className="size-4" />
          {pending ? text.conversationSending : text.conversationSend}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
    </form>
  )
}
