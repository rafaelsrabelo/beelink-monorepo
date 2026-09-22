"use client"

// React
import { useEffect, useId, useRef } from "react"

// Libs
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon } from "lucide-react"

// UI
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Toggle } from "@harness-monorepo/ui/components/toggle"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { domHtmlFromMarkdown, markdownFromDom } from "./rich-text"

export interface RichTextFieldProps {
  label: string
  /** Markdown. What the field shows is formatted; what it reports is text. */
  value: string
  onChange: (markdown: string) => void
  hint?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * A description written with formatting and stored as text.
 *
 * The editor is `contentEditable` with a toolbar, and what leaves it is Markdown — see
 * `./rich-text.ts` for why storage is not HTML. The serialiser is what makes the arrangement safe:
 * whatever the browser or a paste puts in this element, only the handful of nodes it knows survive
 * as formatting.
 *
 * `document.execCommand` is deprecated and is still the only way to do this without a library.
 * That is a real cost and it is bounded: it is used for four commands, every browser in use
 * implements them, and if it is ever withdrawn the replacement changes this file and nothing else
 * — the stored Markdown does not move.
 *
 * The element is **written to only once**, on mount and when the product being edited changes.
 * Re-rendering `innerHTML` from state on every keystroke would move the caret to the start of the
 * field on every letter, which is the classic way a rich text field becomes unusable.
 */
export function RichTextField({
  label,
  value,
  onChange,
  hint,
  disabled = false,
  messages = defaultMessages,
}: RichTextFieldProps) {
  const id = useId()
  const editorRef = useRef<HTMLDivElement>(null)
  const loaded = useRef<string | null>(null)
  const text = messages.catalog.editor

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || loaded.current === value) return

    // Only when the value arrived from outside — a product loading, or the form resetting.
    if (loaded.current === null || markdownFromDom(editor) !== value) {
      editor.innerHTML = domHtmlFromMarkdown(value)
    }
    loaded.current = value
  }, [value])

  function report() {
    const editor = editorRef.current
    if (!editor) return
    const markdown = markdownFromDom(editor)
    loaded.current = markdown
    onChange(markdown)
  }

  function run(command: string) {
    document.execCommand(command)
    editorRef.current?.focus()
    report()
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <div className="border-input overflow-hidden rounded-lg border">
        <div role="toolbar" aria-label={text.toolbar} className="border-input flex gap-1 border-b p-1">
          <Toggle size="sm" disabled={disabled} aria-label={text.bold} onClick={() => run("bold")}>
            <BoldIcon aria-hidden="true" className="size-4" />
          </Toggle>
          <Toggle size="sm" disabled={disabled} aria-label={text.italic} onClick={() => run("italic")}>
            <ItalicIcon aria-hidden="true" className="size-4" />
          </Toggle>
          <Toggle
            size="sm"
            disabled={disabled}
            aria-label={text.bulletList}
            onClick={() => run("insertUnorderedList")}
          >
            <ListIcon aria-hidden="true" className="size-4" />
          </Toggle>
          <Toggle
            size="sm"
            disabled={disabled}
            aria-label={text.numberedList}
            onClick={() => run("insertOrderedList")}
          >
            <ListOrderedIcon aria-hidden="true" className="size-4" />
          </Toggle>
        </div>

        {/*
          `role="textbox"` and `aria-multiline`: a contentEditable div is announced as a group of
          text without them, and a screen reader user is given no way to know it can be typed in.
        */}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={report}
          onBlur={report}
          className="focus-visible:ring-ring min-h-32 p-3 text-sm outline-none focus-visible:ring-2 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
        />
      </div>

      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  )
}
