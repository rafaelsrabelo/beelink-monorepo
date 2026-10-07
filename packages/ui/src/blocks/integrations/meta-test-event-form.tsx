"use client"

// React
import { useId, useState, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { metaTestCodeOf, type MetaTestEventView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface MetaTestEventFormProps {
  /** Hands over the test code as the API takes it. */
  onSubmit: (testEventCode: string) => void
  pending?: boolean
  /** Why the test was not made at all, in words: a code refused, too many tries. */
  error?: string
  /** What Meta said of the last test; null before one. */
  result?: MetaTestEventView | null
  messages?: UiMessages
}

/**
 * "Enviar evento de teste" (BEELINK-274): the code Meta's Events Manager shows under its test tab,
 * and what Meta answered to one synthetic event sent with it — in plain words, with Meta's own
 * beside a refusal, for the shopkeeper to pass on. The answer is announced: it arrives seconds after
 * the click, with nothing else on the page moving.
 */
export function MetaTestEventForm({ onSubmit, pending = false, error, result = null, messages = defaultMessages }: MetaTestEventFormProps) {
  const text = messages.integrations.metaConversions.test
  const id = useId()
  const [typed, setTyped] = useState("")
  const [refused, setRefused] = useState(false)
  const said = refused ? text.errors.META_PIXEL_TEST_CODE_INVALID : error

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || typed.trim() === "") return
    const code = metaTestCodeOf(typed)
    if (code === null) return setRefused(true)
    onSubmit(code)
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={pending || undefined} aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h3 id={`${id}-title`} className="text-sm font-medium">
        {text.title}
      </h3>
      <p className="text-muted-foreground text-sm">{text.lead}</p>
      <Field data-invalid={said ? true : undefined} className="max-w-xs">
        <FieldLabel htmlFor={`${id}-code`}>{text.codeLabel}</FieldLabel>
        <Input
          id={`${id}-code`}
          type="text"
          placeholder={text.codePlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={typed}
          disabled={pending}
          aria-invalid={said ? true : undefined}
          aria-describedby={said ? `${id}-error ${id}-help` : `${id}-help`}
          onChange={(event) => {
            setTyped(event.target.value)
            setRefused(false)
          }}
        />
        {said ? <FieldError id={`${id}-error`}>{said}</FieldError> : null}
        <FieldDescription id={`${id}-help`}>{text.codeHint}</FieldDescription>
      </Field>

      <div>
        <Button type="submit" variant="outline" disabled={pending || typed.trim() === ""}>
          {pending ? text.sending : text.submit}
        </Button>
      </div>

      <div role="status" className="flex flex-col gap-1">
        {result && !pending ? (
          <>
            <p className={cn("text-sm font-medium", result.tone === "error" ? "text-destructive" : "text-foreground")}>{result.message}</p>
            {result.detail ? (
              <p className="text-muted-foreground text-sm break-words">
                {text.detailLabel} {result.detail}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </form>
  )
}
