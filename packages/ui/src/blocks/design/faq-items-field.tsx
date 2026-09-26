"use client"

// React
import { useEffect, useRef } from "react"

// Libs
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** One question as the form holds it. The contract's `FaqItem`, restated. */
export interface FaqValue {
  id: string
  question: string
  answer: string
}

export interface FaqItemsFieldProps {
  value: readonly FaqValue[]
  onChange: (next: FaqValue[]) => void
  /** Ids are the screen's to mint — this package has no clock and no randomness of its own. */
  newItemId: () => string
  messages?: UiMessages
}

/** The most a FAQ holds. The API holds it to the same. */
const FAQ_MAX = 20

/** A question written with no answer yet: the one thing Salvar waits for. */
export function unanswered(row: FaqValue): boolean {
  return !!row.question.trim() && !row.answer.trim()
}

/**
 * A FAQ's questions, in the order the page draws them: written, moved up and down one place at a
 * time, taken out, and added at the end.
 *
 * Arrows and not a drag, for the reason `ShowcasePicksField` gives: a button named "Subir Posso
 * trocar?" is reachable by a thumb, a keyboard and a screen reader alike. A moved question keeps its
 * key, so the button pressed keeps the focus as the row moves.
 */
export function FaqItemsField({ value, onChange, newItemId, messages = defaultMessages }: FaqItemsFieldProps) {
  const text = messages.design.faq

  // A question taken out takes its focused button with it; the focus lands on the question that
  // took its place, or the one above, or the add button when none is left.
  const questions = useRef(new Map<string, HTMLInputElement>())
  const add = useRef<HTMLButtonElement>(null)
  const focusNext = useRef<string | null>(null)

  useEffect(() => {
    const next = focusNext.current
    if (next === null) return
    focusNext.current = null
    ;(questions.current.get(next) ?? add.current)?.focus()
  }, [value])

  const set = (at: number, next: Partial<FaqValue>) => onChange(value.map((row, index) => (index === at ? { ...row, ...next } : row)))

  const move = (from: number, to: number) => {
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onChange(next)
  }

  const remove = (at: number) => {
    focusNext.current = (value[at + 1] ?? value[at - 1])?.id ?? ""
    onChange(value.filter((_, index) => index !== at))
  }

  const append = () => {
    const id = newItemId()
    focusNext.current = id
    onChange([...value, { id, question: "", answer: "" }])
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{text.legend}</FieldLegend>

      {value.length ? (
        <ol className="flex flex-col gap-3">
          {value.map((row, at) => {
            const name = row.question.trim() || format(text.position, { position: String(at + 1) })
            const missing = unanswered(row)

            return (
              <li key={row.id} className="border-shell-border flex flex-col gap-3 rounded-xl border p-3">
                <div className="flex items-start gap-1">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`faq-question-${row.id}`}>{text.question}</FieldLabel>
                    <FieldContent>
                      <Input
                        id={`faq-question-${row.id}`}
                        value={row.question}
                        maxLength={160}
                        ref={(input) => {
                          if (input) questions.current.set(row.id, input)
                          else questions.current.delete(row.id)
                        }}
                        onChange={(event) => set(at, { question: event.target.value })}
                      />
                    </FieldContent>
                  </Field>
                  <div className="flex pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={format(text.up, { question: name })}
                      // Still reachable at the top: a button that turns disabled under the focus drops it.
                      focusableWhenDisabled
                      disabled={at === 0}
                      onClick={() => move(at, at - 1)}
                    >
                      <ArrowUpIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={format(text.down, { question: name })}
                      focusableWhenDisabled
                      disabled={at === value.length - 1}
                      onClick={() => move(at, at + 1)}
                    >
                      <ArrowDownIcon aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={format(text.remove, { question: name })} onClick={() => remove(at)}>
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <Field data-invalid={missing || undefined}>
                  <FieldLabel htmlFor={`faq-answer-${row.id}`}>{text.answer}</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id={`faq-answer-${row.id}`}
                      rows={3}
                      value={row.answer}
                      maxLength={1000}
                      aria-invalid={missing || undefined}
                      aria-describedby={missing ? `faq-answer-${row.id}-missing` : undefined}
                      onChange={(event) => set(at, { answer: event.target.value })}
                    />
                    {/*
                      Not an alert: it appears with the first letter of a question, and an alert would
                      interrupt every question being typed. It is heard when the answer takes the focus.
                    */}
                    {missing ? (
                      <p id={`faq-answer-${row.id}-missing`} className="text-destructive text-sm">
                        {text.answerMissing}
                      </p>
                    ) : null}
                  </FieldContent>
                </Field>
              </li>
            )
          })}
        </ol>
      ) : null}

      {value.length < FAQ_MAX ? (
        <Button ref={add} type="button" variant="outline" onClick={append}>
          <PlusIcon aria-hidden="true" className="size-4" />
          {text.add}
        </Button>
      ) : null}
    </FieldSet>
  )
}
