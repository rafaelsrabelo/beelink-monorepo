"use client"

// React
import { useState } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@harness-monorepo/ui/components/dialog"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface VariationBulkDialogProps {
  /** Null keeps it closed. */
  title: string | null
  label: string
  inputMode: "decimal" | "numeric"
  onApply: (value: string) => void
  onClose: () => void
  messages?: UiMessages
}

/**
 * One value for every selected combination: the same price, or the same stock.
 *
 * A dialog and not a field in the header, because the value is applied to rows the shopkeeper
 * cannot all see at once, and a confirm step is where they notice the count in the title.
 */
export function VariationBulkDialog({
  title,
  label,
  inputMode,
  onApply,
  onClose,
  messages = defaultMessages,
}: VariationBulkDialogProps) {
  const text = messages.catalog.variations
  const [value, setValue] = useState("")

  function apply() {
    onApply(value.trim())
    setValue("")
  }

  return (
    <Dialog
      open={title !== null}
      onOpenChange={(open: boolean) => {
        if (open) return
        setValue("")
        onClose()
      }}
    >
      <DialogContent closeLabel={text.cancel}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            // The dialog sits inside the product form's tree; its own Enter applies, never saves.
            event.preventDefault()
            event.stopPropagation()
            apply()
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="variation-bulk-value">{label}</FieldLabel>
            <Input
              id="variation-bulk-value"
              inputMode={inputMode}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setValue("")
                onClose()
              }}
            >
              {text.cancel}
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {text.apply}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
